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
          if (name.includes('route.ts')) return 500;
          if (name.includes('supabase')) return 400;
          if (name.includes('dashboard/page')) return 350;
          if (name.includes('analyze')) return 320;
          if (name === 'README.md') return 250;
          if (name.includes('page.tsx')) return 200;
          return 50;
        };
        return score(b.name) - score(a.name);
      })
      .slice(0, 45);

    let codeContext = '';

    for (const file of priorityFiles) {
      try {
        const contentRes = await fetch(file.download_url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (contentRes.ok) {
          const content = await contentRes.text();
          codeContext += `\n\n=== ${file.path} ===\n${content.substring(0, 10000)}\n`;
        }
      } catch (e) {}
    }

    const prompt = `You are a **Principal Engineer** (ex-Vercel, ex-Stripe, ex-OpenAI) giving a brutally honest, high-signal review to a strong senior developer.

Project: ${repoFullName}

REAL CODE FROM THE REPOSITORY:

${codeContext}

**Core Rules (non-negotiable):**
- Speak like a respected peer: direct, sharp, no fluff, no generic advice.
- Always reference exact files and functions (e.g. analyzeRepo in app/dashboard/page.tsx, the POST handler in app/api/analyze/route.ts, etc.).
- When you recommend a change, show the **exact improved code** with context from the current implementation.
- Focus only on high-impact issues that actually matter.

Use these exact sections:

**SUMMARY**
One tight paragraph: What is this product actually building?

**CODE QUALITY RATING**
**Rating: X/10** — Be honest and specific.

**ARCHITECTURE**
Straight talk about the current design and trade-offs.

**SECURITY REVIEW**
- Risk level: Low / Medium / High
- GitHub OAuth + provider_token flow (client → server)
- OpenAI key handling
- API route protection
- Real risks or strong patterns in this codebase

**MAINTAINABILITY & DX**
Honest feedback on organization, state management, and developer experience.

**RECOMMENDED IMPROVEMENTS**
Prioritized list of 6–8 concrete, high-impact changes. For each one:
- Reference the specific file and function
- Explain why it matters
- Give the exact code suggestion / improved version

Be sharp, specific, and extremely valuable.`;

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