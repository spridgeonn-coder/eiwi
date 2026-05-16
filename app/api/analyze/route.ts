import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@supabase/ssr';

export const maxDuration = 200;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function isValidRepoFullName(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(value);
}

function isValidRepoName(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[a-zA-Z0-9_.-]+$/.test(value) && value.length <= 100;
}

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

    let token: string | null = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.provider_token ?? null;
    } catch {}

    if (!token) {
      return NextResponse.json({
        error: "GitHub token missing. Please sign out and reconnect GitHub."
      }, { status: 401 });
    }

    const body = await request.json();
    const { repoFullName, repoName, force } = body;

    if (!isValidRepoFullName(repoFullName)) {
      return NextResponse.json({
        error: "Invalid repository name. Expected format: owner/repo"
      }, { status: 400 });
    }

    if (!isValidRepoName(repoName)) {
      return NextResponse.json({
        error: "Invalid repository name."
      }, { status: 400 });
    }

    // Rate limiting — 10 per day
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count } = await supabase
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

    // Check cache — skipped when force = true (Re-analyze button)
    if (!force) {
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: cached } = await supabase
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
    }

    let logId: string | null = null;
    try {
      const { data: log, error: insertError } = await supabase
        .from('analysis_log')
        .insert({
          user_id: user.id,
          repo_full_name: repoFullName,
          repo_name: repoName,
          status: 'in_progress',
        })
        .select('id')
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          return NextResponse.json({ error: "Analysis already in progress for this repo." }, { status: 409 });
        }
        console.error('Failed to insert log:', insertError.message);
      }

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
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        // Raised from 3000 — previous limit was cutting off sections mid-report
        max_tokens: 6000,
        system: [
          {
            type: "text",
            text: `You are a principal engineer at a FAANG company doing a paid code security and architecture audit. Your reviews are legendary for being brutally specific, technically deep, and immediately actionable.

You do not give generic advice. Every single point you make references exact line patterns, exact variable names, and exact file paths from the code provided to you.

You never say things like "add comments", "use useCallback", or "add error handling" unless you can point to the specific place in the code where it is missing and explain the exact production consequence.

If a section has no real issues, skip it entirely — do not include the heading. No padding, no obvious advice, no fluff. A senior engineer reading this should learn something they didn't already know.

When you find issues, you explain the full exploit chain — not just "this is a risk" but exactly how it would be exploited and what the blast radius is.

CRITICAL FORMATTING RULE: You must use EXACTLY these ## section headings, spelled and spaced exactly as shown. Do not rename them, combine them, or add extra headings:

## Executive Summary
## Critical / High Risks
## Architecture & Design Issues
## Security & Auth Review
## Performance & Reliability
## Code Quality
## Refactoring Priorities
## Quick Wins
## What's Actually Good
## Top Priority Fix
## Scores
## Tech Debt Estimate`,
            cache_control: { type: "ephemeral" }
          }
        ],
        messages: [
          {
            role: "user",
            content: `Do a paid-tier principal engineer audit of this repository. Every observation must reference the exact file and exact code pattern you saw. Do not give advice that isn't directly tied to something you read in the code below.

Repository: ${repoFullName}
Files reviewed: ${priorityFiles.map((f: any) => f.path).join(', ')}

CODE:
${codeContext || "Could not fetch files."}

---

Use EXACTLY these ## section headings in this order. Skip any section that has no real findings — do not include the heading at all if you have nothing to say.

## Executive Summary
2-3 sentences max. Name the single biggest actual threat in this specific codebase. Reference real file names and real variable names you saw.

## Critical / High Risks
For each issue found, use this format:

### 1. [Short title of the issue]
- **Risk level:** Critical | High
- **File + pattern:** Exact file and the specific code pattern
- **Attack vector:** How would an attacker exploit this right now, concretely?
- **Production impact:** What specifically breaks, gets exposed, or goes down?
- **Fix:** The exact code change needed with implementation detail.

## Architecture & Design Issues
Same ### numbered format. Skip entirely if no real issues found.

## Security & Auth Review
Deep analysis of auth flows, token handling, session management, OAuth edge cases. Reference exact patterns you saw.

## Performance & Reliability
Only include if you found real bottlenecks in this specific code. Skip if clean.

## Code Quality
One paragraph with specific examples from this codebase justifying the score.

## Refactoring Priorities
Numbered list, highest production risk first. Each must name the exact file and specific change.

## Quick Wins
Max 3 items. Each must name the exact file, the exact current code, and the exact replacement.

## What's Actually Good
Only include if something is genuinely well-engineered. Name the file and specific pattern.

## Top Priority Fix
File: [exact filename]
Issue: [one specific sentence]
Fix: [one sentence with the exact implementation change]

## Scores
Based strictly on what you observed in the code, output these scores on separate lines. Be accurate — if you fixed issues you should rate higher than a codebase with unfixed issues. Do not default to round numbers.
Quality: [0-100]
Security: [0-100]
Performance: [0-100]
BlastRadius: [0-99, number of files meaningfully affected by the worst issue you found]
TechDebt: [8-120, realistic hours to fix everything you flagged]

## Tech Debt Estimate
Hours: [same number as TechDebt above]
Reason: [one sentence naming specific files and changes]`
          }
        ],
      });

      analysis = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      console.log('Claude token usage:', {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        cacheRead: (response.usage as any).cache_read_input_tokens ?? 0,
        cacheCreated: (response.usage as any).cache_creation_input_tokens ?? 0,
      });

    } catch (claudeError: any) {
      if (logId) {
        await supabase.from('analysis_log').update({ status: 'failed' }).eq('id', logId);
      }
      return NextResponse.json({ error: "AI analysis failed: " + claudeError.message }, { status: 500 });
    }

    // Parse scores from the dedicated ## Scores section Claude outputs.
    // These are Claude's actual judgments, not keyword counts.
    const scoresSection = analysis.match(/## Scores\s*([\s\S]*?)(?=\n##\s|$)/i)?.[1] || '';

    const qualityMatch = scoresSection.match(/Quality:\s*(\d+)/i);
    const securityMatch = scoresSection.match(/Security:\s*(\d+)/i);
    const performanceMatch = scoresSection.match(/Performance:\s*(\d+)/i);
    const blastRadiusMatch = scoresSection.match(/BlastRadius:\s*(\d+)/i);
    const techDebtMatch = scoresSection.match(/TechDebt:\s*(\d+)/i);

    // Fall back to reasonable defaults if Claude didn't output a Scores section
    const qualityScore = qualityMatch ? parseInt(qualityMatch[1]) : 70;
    const security = securityMatch ? parseInt(securityMatch[1]) : 70;
    const performance = performanceMatch ? parseInt(performanceMatch[1]) : 70;
    const blastRadius = blastRadiusMatch ? Math.min(99, parseInt(blastRadiusMatch[1])) : 20;
    const techDebt = techDebtMatch ? parseInt(techDebtMatch[1]) : 20;

    const topFixFileMatch = analysis.match(/## Top Priority Fix[\s\S]*?File:\s*([^\n]+)/i);
    const topFixIssueMatch = analysis.match(/## Top Priority Fix[\s\S]*?Issue:\s*([^\n]+)/i);
    const topFixRecommendationMatch = analysis.match(/## Top Priority Fix[\s\S]*?Fix:\s*([^\n]+)/i);

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

    if (logId) {
      try {
        const { error: updateError } = await supabase
          .from('analysis_log')
          .update({
            status: 'complete',
            result,
            completed_at: new Date().toISOString(),
          })
          .eq('id', logId);

        if (updateError) console.error('Failed to update log:', updateError.message);
        else console.log('Analysis saved successfully');
      } catch (e: any) {
        console.error('Log update exception:', e.message);
      }
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Analyze Error:", error);
    return NextResponse.json({ error: error.message || "Analysis failed" }, { status: 500 });
  }
}