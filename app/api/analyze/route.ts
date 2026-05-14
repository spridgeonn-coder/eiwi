import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';

export const maxDuration = 200;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { repoFullName, repoName } = await request.json();

    let token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      const { data: profile } = await supabase.from('profile').select('github_token').eq('user_id', user.id).single();
      token = profile?.github_token;
    }
    if (!token) return NextResponse.json({ error: "GitHub token missing" }, { status: 401 });

    const importantDirs = ['', 'app', 'lib', 'components', 'src', 'utils', 'hooks', 'api', 'middleware'];
    let allFiles: any[] = [];

    for (const dir of importantDirs) {
      try {
        const url = dir
          ? `https://api.github.com/repos/${repoFullName}/contents/${dir}`
          : `https://api.github.com/repos/${repoFullName}/contents`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          allFiles = [...allFiles, ...(Array.isArray(data) ? data : [data])];
        }
      } catch (_) {}
    }

    const priorityFiles = allFiles
      .filter((f: any) => f.type === 'file' &&
        (f.name.endsWith('.tsx') || f.name.endsWith('.ts') || f.name.endsWith('.js') ||
         f.name === 'README.md' || f.name.includes('package.json')))
      .slice(0, 30);

    let codeContext = '';
    for (const file of priorityFiles) {
      try {
        const res = await fetch(file.download_url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          let content = await res.text();
          if (content.length > 11500) content = content.slice(0, 11500) + "\n// ... truncated";
          codeContext += `\n\n=== ${file.path} ===\n${content}\n`;
        }
      } catch (_) {}
    }

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

If a section has no real issues, skip it or say the code is clean there. No padding, no obvious advice, no fluff. A senior engineer reading this should learn something they didn't already know.`
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
  **Fix:** The exact code change needed — not "add error handling" but the actual implementation pattern.

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

    const analysis = completion.choices[0]?.message?.content || "No analysis generated.";

    // Quality score
    const qualityMatch = analysis.match(/Code Quality[^\d]*(\d+)\s*\/\s*10/i);
    const qualityScore = qualityMatch ? Math.round(parseInt(qualityMatch[1]) * 10) : 75;

    // Blast radius
    const criticalCount = (analysis.match(/\*\*Risk level: Critical\*\*/gi) || []).length;
    const highCount = (analysis.match(/\*\*Risk level: High\*\*/gi) || []).length;
    const blastRadius = Math.min(99, (criticalCount * 15) + (highCount * 8) + 20);

    // Security score
    const securityIssues = (analysis.match(/security|auth|token|exposure/gi) || []).length;
    const security = Math.max(10, 100 - (securityIssues * 3));

    // Performance score
    const perfIssues = (analysis.match(/performance|slow|latency|optimize/gi) || []).length;
    const performance = Math.max(10, 100 - (perfIssues * 4));

    // Tech debt hours
    const techDebtMatch = analysis.match(/Hours:\s*(\d+)/i);
    const techDebt = techDebtMatch ? parseInt(techDebtMatch[1]) : 20;

    // Top priority fix
    const topFixFileMatch = analysis.match(/Top Priority Fix[\s\S]*?File:\s*([^\n]+)/i);
    const topFixIssueMatch = analysis.match(/Top Priority Fix[\s\S]*?Issue:\s*([^\n]+)/i);
    const topFixRecommendationMatch = analysis.match(/Top Priority Fix[\s\S]*?Fix:\s*([^\n]+)/i);

    const topPriorityFix = {
      file: topFixFileMatch?.[1]?.trim() || 'See full analysis',
      issue: topFixIssueMatch?.[1]?.trim() || 'Critical issue detected — view full analysis for details',
      fix: topFixRecommendationMatch?.[1]?.trim() || 'See recommendations in the Analysis tab',
    };

    // Files scanned with status
    const scannedFiles = priorityFiles.map((f: any) => {
      const name = f.path;
      const lowerAnalysis = analysis.toLowerCase();
      const lowerName = name.toLowerCase();
      const nameIndex = lowerAnalysis.indexOf(lowerName);
      const isCritical = nameIndex !== -1 &&
        (lowerAnalysis.slice(Math.max(0, nameIndex - 100), nameIndex + 200).includes('critical'));
      const isReview = nameIndex !== -1 &&
        (lowerAnalysis.slice(Math.max(0, nameIndex - 100), nameIndex + 200).includes('high') ||
         lowerAnalysis.slice(Math.max(0, nameIndex - 100), nameIndex + 200).includes('risk'));
      return {
        path: name,
        status: isCritical ? 'Critical' : isReview ? 'Review' : 'Clean',
      };
    }).slice(0, 6);

    return NextResponse.json({
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
    });

  } catch (error: any) {
    console.error("Analyze Error:", error);
    return NextResponse.json({ error: error.message || "Analysis failed" }, { status: 500 });
  }
}