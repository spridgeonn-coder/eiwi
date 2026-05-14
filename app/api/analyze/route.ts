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
        const url = dir ? `https://api.github.com/repos/${repoFullName}/contents/${dir}` : `https://api.github.com/repos/${repoFullName}/contents`;
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
      max_tokens: 3600,
      messages: [
        {
          role: "system",
          content: `You are a Staff+ Engineer giving extremely high-signal, technical code reviews.

Style: Dense, bullet-heavy, no fluff. Every point must be specific, actionable, and reference real files/patterns from the code.
Risk levels: Critical, High, Medium, Low.
Focus on: security, auth, tokens, scaling, reliability, Supabase patterns, GitHub OAuth pitfalls, Vercel/Next.js gotchas, etc.`
        },
        {
          role: "user",
          content: `Review this repository as a Staff Engineer. Be sharp and technical.

Repository: ${repoFullName}

Files reviewed: ${priorityFiles.map((f: any) => f.path).join(', ')}

CODE:
${codeContext || "Could not fetch files."}

Deliver the review in this exact style and structure:

**Executive Summary**  
One paragraph with overall maturity and biggest concerns.

**Critical / High Risks**  
- **Risk level: High/Critical**  
  **Description:** Detailed observation referencing exact file + code pattern.  
  **Why it matters:** Real production impact.  
  **Recommendation:** Concrete fix or refactor.

**Architecture & Design Issues**

**Security & Auth Review**

**Performance & Reliability**

**Code Quality — X/10**

**Refactoring Priorities** (numbered, highest impact first)

**Quick Wins** (very specific, file + code)

**What's Actually Good** (only if genuinely strong)`
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