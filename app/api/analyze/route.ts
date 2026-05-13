import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { repoFullName, repoName } = await request.json();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) return NextResponse.json({ error: "GitHub token missing" }, { status: 401 });

    // Maximum file coverage
    const directories = ['', 'app', 'lib', 'components', 'app/api', 'app/dashboard', 'app/profile', 'app/login'];
    let allFiles: any[] = [];

    for (const dir of directories) {
      try {
        const url = dir 
          ? `https://api.github.com/repos/${repoFullName}/contents/${dir}`
          : `https://api.github.com/repos/${repoFullName}/contents`;
        
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        if (res.ok) {
          const data = await res.json();
          allFiles = [...allFiles, ...(Array.isArray(data) ? data : [data])];
        }
      } catch (e) {}
    }

    // Ultra-prioritize the most important files
    const priorityFiles = allFiles
      .filter((f: any) => f.type === 'file')
      .sort((a: any, b: any) => {
        const score = (name: string) => {
          if (name.includes('route.ts')) return 300;
          if (name.includes('supabase')) return 250;
          if (name.includes('dashboard/page')) return 220;
          if (name.includes('analyze')) return 210;
          if (name === 'README.md') return 180;
          if (name.includes('page.tsx')) return 150;
          return 50;
        };
        return score(b.name) - score(a.name);
      })
      .slice(0, 35);

    let codeContext = '';

    for (const file of priorityFiles) {
      try {
        const contentRes = await fetch(file.download_url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (contentRes.ok) {
          const content = await contentRes.text();
          codeContext += `\n\n=== ${file.path} ===\n${content.substring(0, 8000)}\n`;
        }
      } catch (e) {}
    }

    const prompt = `You are a **Principal Engineer** (ex-Vercel, ex-Stripe, ex-OpenAI) giving a ruthless, high-signal code review to a peer senior developer who expects excellence.

Project: ${repoFullName}

REAL CODE FROM THE REPOSITORY:

${codeContext}

**Strict Instructions:**
- Reference actual files, functions, and code patterns by name.
- Never give generic advice. Every point must tie back to something in this codebase.
- Be critical and direct.

Use these exact sections:

**SUMMARY**
One precise paragraph: What is this product? Who is it for? Core value?

**CODE QUALITY RATING**
**Rating: X/10** — Justify honestly with evidence.

**ARCHITECTURE**
Honest assessment of the Next.js + Supabase + AI setup.

**SECURITY REVIEW**
- Overall risk: Low / Medium / High
- Detailed analysis of GitHub OAuth + provider_token flow (client → server)
- OpenAI key handling and server-side isolation
- API route protection (especially /api/analyze)
- Any actual risks, leaks, or strong practices you observe
- Specific file and function references

**MAINTAINABILITY & DEVELOPER EXPERIENCE**
Code organization, TypeScript quality, error handling, onboarding.

**RECOMMENDED IMPROVEMENTS**
Prioritized list of 6–8 concrete, high-impact changes with clear reasoning and business value.

Be specific, sharp, and valuable. No fluff. No generic security checklist items.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    return NextResponse.json({
      success: true,
      repo: repoName,
      analysis: completion.choices[0]?.message?.content || "No response"
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}