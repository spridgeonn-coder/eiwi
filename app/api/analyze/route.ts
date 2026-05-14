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

    // Improved file discovery
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
      .slice(0, 28);

    let codeContext = '';
    for (const file of priorityFiles) {
      try {
        const res = await fetch(file.download_url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          let content = await res.text();
          if (content.length > 11000) content = content.slice(0, 11000) + "\n// ... truncated";
          codeContext += `\n\n=== ${file.path} ===\n${content}\n`;
        }
      } catch (_) {}
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.15,
      max_tokens: 3400,
      messages: [
        {
          role: "system",
          content: `You are a Staff+ Engineer (ex-FAANG / ex-unicorn) who has built and scaled multiple production systems.

You give **brutally honest**, extremely high-signal code reviews for mid-to-senior developers. 
Your goal is to give feedback that is genuinely valuable — the kind you would pay for.

CORE RULES:
- Never use filler praise or corporate speak.
- Be specific. Reference exact files, functions, and patterns you see.
- Every meaningful issue must have: exact location + production impact + concrete, high-quality fix with code.
- Prioritize by real blast radius (outages, security, data loss, scaling pain, developer velocity).
- Think like a principal engineer: architecture, long-term maintainability, observability, cost, DX.`
        },
        {
          role: "user",
          content: `Review this repository as a Staff Engineer.

Repository: ${repoFullName}

Files reviewed: ${priorityFiles.map((f: any) => f.path).join(', ')}

CODE CONTEXT:
${codeContext || "Could not fetch files — advise user to check GitHub permissions."}

---

Deliver your review using **exactly** these sections. Do not add or remove any.

## Executive Summary
2-3 sentences. Direct verdict on the codebase maturity and biggest risk/opportunity.

## Blast Radius Issues 🔴
Critical issues that could cause outages, security breaches, or data problems.
For each: File + exact problem + why it's dangerous in production + concrete fix with code.

## Architecture & Scaling
How this codebase will behave at 10x traffic or 10x size. What will break first? Highest-leverage architectural refactor?

## Security & Secrets
Auth, token handling, Supabase, GitHub OAuth, environment variables, etc. Rate severity honestly.

## Performance & Reliability
N+1s, blocking operations, error handling, retry logic, rate limiting quality, resilience to external services failing.

## Code Quality — X/10
Justify the score with specific examples from the code you saw.

## Refactoring Priorities
Top 4-6 issues ordered by impact. For each:
- What (file + area)
- Why it matters
- How (before → after code)

## Quick Wins (ship this week)
3-6 highly specific, high-ROI changes. Be extremely concrete with file names and code.

## What's Actually Good
Only include if something genuinely stands out as strong. Otherwise omit this section.`
        }
      ],
    });

    const analysis = completion.choices[0]?.message?.content || "Analysis failed to generate.";

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