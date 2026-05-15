import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 200;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Service role client — bypasses RLS for server-side DB writes
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchDirRecursive(
  repoFullName: string,
  token: string,
  path: string = '',
  depth: number = 0,
  collected: any[] = []
): Promise<any[]> {
  if (depth > 3 || collected.length > 80) return collected;
  try {
    const url = path
      ? `https://api.github.com/repos/${repoFullName}/contents/${path}`
      : `https://api.github.com/repos/${repoFullName}/contents`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return collected;
    const items = await res.json();
    if (!Array.isArray(items)) return collected;

    for (const item of items) {
      if (item.type === 'file') {
        collected.push(item);
      } else if (item.type === 'dir') {
        const skip = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage', 'public', '.husky'];
        if (!skip.includes(item.name)) {
          await fetchDirRecursive(repoFullName, token, item.path, depth + 1, collected);
        }
      }
    }
  } catch (_) {}
  return collected;
}

export async function POST(request: NextRequest) {
  try {
    // Use cookie-based client only for auth verification
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
    );

    let user;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      user = data.user;
    } catch {
      return NextResponse.json({ error: "Auth service unavailable" }, { status: 503 });
    }

    const { repoFullName, repoName } = await request.json();

    // Load token from DB using admin client
    let token: string | null = null;
    try {
      const { data: profile } = await supabaseAdmin
        .from('profile')
        .select('github_token')
        .eq('user_id', user.id)
        .single();
      token = profile?.github_token ?? null;
    } catch {
      return NextResponse.json({ error: "Could not load GitHub token" }, { status: 500 });
    }

    if (!token) return NextResponse.json({ error: "GitHub token missing. Please reconnect GitHub in your profile." }, { status: 401 });

    // Rate limiting — max 10 analyses per user per day
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabaseAdmin
        .from('analysis_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      if ((count ?? 0) >= 10) {
        return NextResponse.json({
          error: "Daily limit reached. You can run 10 analyses per day. Upgrade to Pro for unlimited analyses."
        }, { status: 429 });
      }
    } catch {}

    // Check cache — return existing result if analyzed within last hour
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: cached } = await supabaseAdmin
        .from('analysis_log')
        .select('result')
        .eq('user_id', user.id)
        .eq('repo_full_name', repoFullName)
        .eq('status', 'complete')
        .gte('created_at', oneHourAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cached?.result) {
        return NextResponse.json({ ...cached.result, cached: true });
      }
    } catch {}

    // Race condition guard
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: inProgress } = await supabaseAdmin
        .from('analysis_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('repo_full_name', repoFullName)
        .eq('status', 'in_progress')
        .gte('created_at', fiveMinutesAgo)
        .single();

      if (inProgress) {
        return NextResponse.json({ error: "Analysis already in progress for this repo." }, { status: 409 });
      }
    } catch {}

    // Log as in_progress
    let logId: string | null = null;
    try {
      const { data: log, error: logError } = await supabaseAdmin
        .from('analysis_log')
        .insert({
          user_id: user.id,
          repo_full_name: repoFullName,
          repo_name: repoName,
          status: 'in_progress',
        })
        .select('id')
        .single();

      if (logError) console.error('Failed to insert log:', logError);
      logId = log?.id ?? null;
    } catch (e) {
      console.error('Log insert exception:', e);
    }

    const allFiles = await fetchDirRecursive(repoFullName, token);

    const priorityFiles = allFiles
      .filter((f: any) => {
        const name = f.name.toLowerCase();
        return (
          name.endsWith('.tsx') ||
          name.endsWith('.ts') ||
          name.endsWith('.js') ||
          name.endsWith('.jsx') ||
          name.endsWith('.env.example') ||
          name === 'readme.md' ||
          name === 'package.json' ||
          name === 'next.config.ts' ||
          name === 'next.config.js' ||
          name === 'middleware.ts' ||
          name === 'middleware.js'
        );
      })
      .filter((f: any) => {
        const name = f.name.toLowerCase();
        return (
          !name.includes('.test.') &&
          !name.includes('.spec.') &&
          !name.includes('.d.ts') &&
          !name.includes('package-lock') &&
          !name.includes('yarn.lock')
        );
      })
      .sort((a: any, b: any) => {
        const priority = ['middleware', 'auth', 'api', 'route', 'supabase', 'config', 'env'];
        const aScore = priority.findIndex(p => a.path.toLowerCase().includes(p));
        const bScore = priority.findIndex(p => b.path.toLowerCase().includes(p));
        return (aScore === -1 ? 99 : aScore) - (bScore === -1 ? 99 : bScore);
      })
      .slice(0, 40);

    let codeContext = '';
    for (const file of priorityFiles) {
      try {
        const res = await fetch(file.download_url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          let content = await res.text();
          if (content.length > 8000) content = content.slice(0, 8000) + "\n// ... truncated";
          codeContext += `\n\n=== ${file.path} ===\n${content}\n`;
        }
      } catch (_) {}
    }

    let analysis = "No analysis generated.";
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.1,
        max_tokens: 4000,
        messages: [
          {
            role: "system",
            content: `You are a principal engineer at a FAANG company doing a paid code security and architecture audit. Your reviews are legendary for being brutally specific, technically deep, and immediately actionable.

You do not give generic advice. Every single point you make references exact line patterns, exact variable names, and exact file paths from the code provided to you.

You never say things like "add comments", "use useCallback", or "add error handling" unless you can point to the specific place in the code where it is missing and explain the exact production consequence.

If a section has no real issues, skip it or say the code is clean there. No padding, no obvious advice, no fluff. A senior engineer reading this should learn something they didn't already know.

When you find issues, you explain the full exploit chain — not just "this is a risk" but exactly how it would be exploited and what the blast radius is.`
          },
          {
            role: "user",
            content: `Do a paid-tier principal engineer audit of this repository. Every observation must reference the exact file and exact code pattern you saw. Do not give advice that isn't directly tied to something you read in the code below.

Repository: ${repoFullName}
Files reviewed: ${priorityFiles.map((f: any) => f.path).join(', ')}

CODE:
${codeContext || "Could not fetch files."}

---

Deliver in this exact structure. Be surgical and specific:

**Executive Summary**
2-3 sentences max. Name the single biggest actual threat in this specific codebase. Reference real file names and real variable names you saw.

**Critical / High Risks**
For each issue found:
- **Risk level: Critical | High**
  **File + pattern:** Exact file and the specific code pattern (e.g. \`middleware.ts — supabase.auth.getUser() called outside try/catch, will throw on network failure\`)
  **Attack vector:** How would an attacker or production outage exploit this right now, concretely?
  **Production impact:** What specifically breaks, gets exposed, or goes down?
  **Fix:** The exact code change needed — not "add error handling" but the actual implementation with code.

**Architecture & Design Issues**
Same format — file + exact pattern, not generalities. Skip entirely if no real issues found.

**Security & Auth Review**
Go deep on auth flows, token handling, session management, OAuth edge cases specific to this code. Reference exact Supabase and Next.js patterns you saw.

**Performance & Reliability**
Only include if you found real bottlenecks in this specific code. No generic React advice.

**Code Quality — X/10**
One paragraph with specific examples from this codebase justifying the score.

**Refactoring Priorities**
Numbered, highest production risk first. Each must name the exact file and the specific change required.

**Quick Wins**
Max 3 items. Each one must name the exact file, the exact current code, and the exact replacement.

**What's Actually Good**
Only include if something is genuinely well-engineered. Name the file and the specific pattern worth keeping.

**Top Priority Fix**
File: [exact filename from the code]
Issue: [one specific sentence naming the exact variable/function/pattern]
Fix: [one sentence with the exact implementation change]

**Tech Debt Estimate**
Hours: [realistic number between 8 and 120]
Reason: [one sentence naming the specific files and changes driving that estimate]`
          }
        ],
      });
      analysis = completion.choices[0]?.message?.content || "No analysis generated.";
    } catch (openaiError: any) {
      if (logId) {
        await supabaseAdmin.from('analysis_log').update({ status: 'failed' }).eq('id', logId);
      }
      return NextResponse.json({ error: "AI analysis failed: " + openaiError.message }, { status: 500 });
    }

    // Parse structured data
    const qualityMatch = analysis.match(/Code Quality[^\d]*(\d+)\s*\/\s*10/i);
    const qualityScore = qualityMatch ? Math.round(parseInt(qualityMatch[1]) * 10) : 75;

    const criticalCount = (analysis.match(/\*\*Risk level: Critical\*\*/gi) || []).length;
    const highCount = (analysis.match(/\*\*Risk level: High\*\*/gi) || []).length;
    const blastRadius = Math.min(99, (criticalCount * 15) + (highCount * 8) + 20);

    const securityIssues = (analysis.match(/security|auth|token|exposure/gi) || []).length;
    const security = Math.max(10, 100 - (securityIssues * 3));

    const perfIssues = (analysis.match(/performance|slow|latency|optimize/gi) || []).length;
    const performance = Math.max(10, 100 - (perfIssues * 4));

    const techDebtMatch = analysis.match(/Hours:\s*(\d+)/i);
    const techDebt = techDebtMatch ? parseInt(techDebtMatch[1]) : 20;

    const topFixFileMatch = analysis.match(/Top Priority Fix[\s\S]*?File:\s*([^\n]+)/i);
    const topFixIssueMatch = analysis.match(/Top Priority Fix[\s\S]*?Issue:\s*([^\n]+)/i);
    const topFixRecommendationMatch = analysis.match(/Top Priority Fix[\s\S]*?Fix:\s*([^\n]+)/i);

    const topPriorityFix = {
      file: topFixFileMatch?.[1]?.trim() || 'See full analysis',
      issue: topFixIssueMatch?.[1]?.trim() || 'Critical issue detected — view full analysis for details',
      fix: topFixRecommendationMatch?.[1]?.trim() || 'See recommendations in the Analysis tab',
    };

    const scannedFiles = priorityFiles.map((f: any) => {
      const name = f.path;
      const lowerAnalysis = analysis.toLowerCase();
      const lowerName = name.toLowerCase();
      const nameIndex = lowerAnalysis.indexOf(lowerName);
      const surroundingText = nameIndex !== -1
        ? lowerAnalysis.slice(Math.max(0, nameIndex - 150), nameIndex + 300)
        : '';
      const isCritical = surroundingText.includes('critical');
      const isReview = surroundingText.includes('high') || surroundingText.includes('risk') || surroundingText.includes('vulnerability');
      return {
        path: name,
        status: isCritical ? 'Critical' : isReview ? 'Review' : 'Clean',
      };
    }).slice(0, 6);

    const result = {
      success: true,
      repo: repoName,
      analysis,
      structured: {
        qualityScore,
        blastRadius,
        security,
        performance,
        techDebt,
        topPriorityFix,
        scannedFiles,
      }
    };

    // Save result and mark complete
    if (logId) {
      try {
        const { error: updateError } = await supabaseAdmin
          .from('analysis_log')
          .update({
            status: 'complete',
            result,
            completed_at: new Date().toISOString(),
          })
          .eq('id', logId);

        if (updateError) console.error('Failed to update log:', updateError);
      } catch (e) {
        console.error('Log update exception:', e);
      }
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Analyze Error:", error);
    return NextResponse.json({ error: error.message || "Analysis failed" }, { status: 500 });
  }
}