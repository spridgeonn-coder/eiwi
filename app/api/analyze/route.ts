import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';

export const maxDuration = 180;

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

    // Fetch files
    const importantDirs = ['', 'app', 'lib', 'components', 'src', 'utils', 'hooks', 'api'];
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
        (f.name.endsWith('.tsx') || f.name.endsWith('.ts') || f.name.endsWith('.js') || f.name === 'README.md'))
      .slice(0, 25);

    let codeContext = '';
    for (const file of priorityFiles) {
      try {
        const res = await fetch(file.download_url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          let content = await res.text();
          if (content.length > 12000) content = content.slice(0, 12000) + "\n// ... truncated";
          codeContext += `\n\n=== ${file.path} ===\n${content}\n`;
        }
      } catch (_) {}
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      max_tokens: 3200,
      messages: [
        {
          role: "system",
          content: `You are a staff-level engineer who has shipped production systems at scale.
You are reviewing a real codebase for a mid-to-senior developer who wants brutal honesty — not encouragement.

RULES:
- Never say "great job" or use filler praise
- If something is fine, skip it — only surface what actually matters
- Every issue must include: the exact file, WHY it matters in production, and a concrete fix with a real code snippet
- Prioritize by blast radius: what could cause an outage, data loss, or security breach first
- If you can't find a file to reference, say so — do not fabricate specifics
- Rate things on real production standards, not "for a side project this is fine"`
        },
        {
          role: "user",
          content: `Review this repository as a staff engineer.

Repository: ${repoFullName}
Files reviewed: ${priorityFiles.map((f: any) => f.path).join(', ')}

CODE:
${codeContext || "No files could be fetched — tell the user to check their GitHub token."}

---

Deliver your analysis using EXACTLY these markdown sections. Do not add extra sections or skip any.

## Executive Summary
2-3 sentences max. Overall verdict, single biggest risk, single biggest opportunity. Be direct.

## Blast Radius Issues 🔴
Issues that could cause an outage, data breach, or data loss RIGHT NOW.
For each:
- **File:** exact path
- **Problem:** what it is and why it's dangerous
- **Fix:**
\`\`\`typescript
// concrete fixed code here
\`\`\`
If none found, say: "No critical blast radius issues identified."

## Architecture & Design
- Is the structure appropriate for what this app does?
- What breaks first at 10x traffic or 10x codebase size?
- One specific refactor with the highest leverage.

## Security Findings
Check auth, data access, API routes, and environment handling.
For each finding: Severity (Critical / High / Medium), file, issue, fix.
If nothing critical, say so plainly.

## Performance & Reliability
- Any N+1 queries, waterfall fetches, or unindexed lookups?
- Missing error handling, unhandled promise rejections, or silent failures?
- What happens when GitHub or the AI API goes down?

## Code Quality — X/10
Justify the score with specifics. What's dragging it down? What's holding it up?

## Refactoring Priorities
Numbered, ordered by impact. For each:
1. **What:** specific file + area
2. **Why it matters:** production impact
3. **How:** before → after code example

## Quick Wins (ship this week)
3-5 changes under an hour each. Be specific — not "add error handling" but exactly which file, which function, and what the fix looks like.

## What's Actually Good
1-3 things done well. Skip this section entirely if nothing stands out.`
        }
      ],
    });

    const analysis = completion.choices[0]?.message?.content || "No analysis generated.";

    return NextResponse.json({
      success: true,
      repo: repoName,
      analysis,
    });

  } catch (error: any) {
    console.error("Analyze Error:", error);
    return NextResponse.json({ error: error.message || "Analysis failed" }, { status: 500 });
  }
}