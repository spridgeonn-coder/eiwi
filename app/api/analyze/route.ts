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

    const priorityFiles = allFiles
      .filter((f: any) => f.type === 'file')
      .sort((a: any, b: any) => {
        const score = (name: string) => {
          if (name.includes('route.ts')) return 400;
          if (name.includes('supabase')) return 350;
          if (name.includes('dashboard/page')) return 300;
          if (name.includes('analyze')) return 280;
          if (name === 'README.md') return 220;
          if (name.includes('page.tsx')) return 180;
          return 50;
        };
        return score(b.name) - score(a.name);
      })
      .slice(0, 40);

    let codeContext = '';

    for (const file of priorityFiles) {
      try {
        const contentRes = await fetch(file.download_url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (contentRes.ok) {
          const content = await contentRes.text();
          codeContext += `\n\n=== ${file.path} ===\n${content.substring(0, 9500)}\n`;
        }
      } catch (e) {}
    }

    const prompt = `You are a **Principal Engineer** (ex-Vercel / Stripe level) giving a no-BS, high-signal review to a strong senior developer who built this project.

Project: ${repoFullName}

REAL CODE FROM THE REPOSITORY:

${codeContext}

**Core Rules (non-negotiable):**
- Speak like a respected peer: direct, sharp, constructive.
- Always reference exact files and functions.
- When you recommend a fix, show the **exact improved code** (with context).
- Focus on high-impact issues that actually matter in production.

Use these exact sections:

**SUMMARY**
One tight paragraph: What is this product actually building and who is it for?

**CODE QUALITY RATING**
**Rating: X/10** — Be honest and specific.

**ARCHITECTURE**
Straight talk about the current Next.js + Supabase + client-heavy design. Point out real strengths and problems.

**SECURITY REVIEW**
- Risk level: Low / Medium / High
- GitHub OAuth + provider_token flow (client → server)
- OpenAI key handling
- API route protection
- Any real risks or strong patterns you see

**MAINTAINABILITY & DX**
Honest feedback on organization, state management, and developer experience.

**RECOMMENDED IMPROVEMENTS**
Prioritized list of 6–8 concrete, high-impact changes. For each one:
- Reference the specific file/function
- Explain why it matters
- Give the exact code suggestion / improved version

Be sharp, specific, and valuable. No generic advice.`;

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