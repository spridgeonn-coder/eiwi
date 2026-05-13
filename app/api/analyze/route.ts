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
          codeContext += `\n\n=== ${file.path} ===\n${content.substring(0, 8500)}\n`;
        }
      } catch (e) {}
    }

    const prompt = `You are a Principal Engineer speaking directly to a strong mid-to-senior developer as a peer.

Project: ${repoFullName}

REAL CODE FROM THE REPOSITORY:

${codeContext}

Strict Instructions:
- Talk like a senior peer: direct, practical, no fluff.
- Always reference exact files and functions (e.g. analyzeRepo in app/dashboard/page.tsx, the POST handler in app/api/analyze/route.ts, etc.).
- When you spot an issue, follow it immediately with a concrete code suggestion showing the improved version.

Use these exact sections:

**SUMMARY**
One tight paragraph: What is this product?

**CODE QUALITY RATING**
**Rating: X/10** — Be honest.

**ARCHITECTURE**
Honest feedback on the current design.

**SECURITY REVIEW**
- Risk level: Low / Medium / High
- GitHub OAuth + provider_token flow
- OpenAI key handling
- API route protection
- Real risks in this codebase

**MAINTAINABILITY & DX**
Feedback on organization and developer experience.

**RECOMMENDED IMPROVEMENTS**
Prioritized list of 6–8 concrete changes. For each one:
- Reference the specific code/file
- Explain why it matters
- Give an exact code example of the suggested fix

Be sharp, specific, and high-value.`;

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