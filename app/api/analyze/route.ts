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
          codeContext += `\n\n=== ${file.path} ===\n${content.substring(0, 8200)}\n`;
        }
      } catch (e) {}
    }

    const prompt = `You are a **Principal Engineer** (ex-Vercel / Stripe level) speaking directly to a **strong mid-to-senior developer** who built this project.

Your goal is to give **extremely valuable, high-signal feedback** — the kind a senior engineer would actually appreciate and act on. Be direct, critical when needed, and never generic.

Project: ${repoFullName}

REAL CODE FROM THE REPOSITORY:

${codeContext}

**Strict Rules for You:**
- Reference exact files, functions, and code patterns by name.
- When suggesting improvements, give concrete code examples where helpful.
- Assume the reader is experienced — skip basic advice.

Use these exact sections:

**SUMMARY**
One tight, accurate paragraph: What is this product? Who is it for? Core value?

**CODE QUALITY RATING**
**Rating: X/10** — Be honest and specific.

**ARCHITECTURE**
Straight talk about the current design decisions, strengths, and problems.

**SECURITY REVIEW**
- Risk level: Low / Medium / High
- GitHub OAuth + provider_token flow
- OpenAI key handling
- API route protection
- Any real risks or strong practices in this codebase

**MAINTAINABILITY & DX**
Honest feedback on organization, TypeScript, error handling, and developer experience.

**RECOMMENDED IMPROVEMENTS**
Prioritized list of 6–8 concrete, high-impact changes. For each, explain why it matters and (where useful) give a code snippet.

Be sharp, specific, and valuable.`;

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