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

    // Aggressive file fetching from key directories
    const directories = ['', 'app', 'lib', 'components', 'app/api', 'app/dashboard', 'app/profile'];
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

    // Super prioritize critical files
    const priorityFiles = allFiles
      .filter((f: any) => f.type === 'file')
      .sort((a: any, b: any) => {
        const score = (name: string) => {
          if (name.includes('route.ts')) return 200;
          if (name.includes('supabase')) return 180;
          if (name.includes('dashboard/page')) return 160;
          if (name === 'README.md') return 140;
          if (name.includes('analyze')) return 130;
          if (name.includes('page.tsx')) return 100;
          return 50;
        };
        return score(b.name) - score(a.name);
      })
      .slice(0, 30);

    let codeContext = '';

    for (const file of priorityFiles) {
      try {
        const contentRes = await fetch(file.download_url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (contentRes.ok) {
          const content = await contentRes.text();
          codeContext += `\n\n=== ${file.path} ===\n${content.substring(0, 7200)}\n`;
        }
      } catch (e) {}
    }

    const prompt = `You are a **Principal Engineer** at a top company (ex-Vercel, Stripe, or OpenAI) doing a no-BS, high-signal code review for a strong senior developer.

Project: ${repoFullName}

Here is **real code** from the repository:

${codeContext}

**Rules:**
- Be extremely specific. Reference actual files and code patterns.
- Never give generic advice like "use env vars" or "add middleware" unless you tie it directly to something you see in this codebase.
- Be critical where warranted.

Use these exact sections:

**SUMMARY**
One sharp paragraph: What is this product? Who is it for? Core value?

**CODE QUALITY RATING**
**Rating: X/10** — Justify with specifics.

**ARCHITECTURE**
Honest evaluation of Next.js + Supabase + AI setup.

**SECURITY REVIEW**
- Overall risk: Low / Medium / High
- Deep analysis of GitHub OAuth + provider_token flow (client → server)
- OpenAI key handling
- API route protection (or lack thereof)
- Any real risks or clever practices you see
- Specific file references

**MAINTAINABILITY & DX**
Code organization, TypeScript usage, error handling, developer experience.

**RECOMMENDED IMPROVEMENTS**
Prioritized list of 6–8 concrete, high-leverage changes with clear reasoning.

Stay ruthless and specific. No fluff.`;

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