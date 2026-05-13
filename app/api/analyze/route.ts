import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
      .slice(0, 50);

    let codeContext = '';

    for (const file of priorityFiles) {
      try {
        const contentRes = await fetch(file.download_url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (contentRes.ok) {
          const content = await contentRes.text();
          codeContext += `\n\n=== ${file.path} ===\n${content.substring(0, 12000)}\n`;
        }
      } catch (e) {}
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      temperature: 0.5,
      messages: [{
        role: "user",
        content: `You are a Principal Engineer reviewing code written by a strong senior developer. Speak directly to them as a peer.

Project: ${repoFullName}

REAL CODE FROM THE REPOSITORY:

${codeContext}

**Strict Rules:**
- Be direct, sharp, and high-signal.
- Always reference exact files and functions.
- When suggesting a change, give the exact tailored code improvement.
- Focus on high-impact, senior-level insights.

Use these exact sections:

**SUMMARY**
One tight paragraph: What is this product actually building?

**CODE QUALITY RATING**
**Rating: X/10** — Be honest.

**ARCHITECTURE**
Honest assessment of the current design.

**SECURITY REVIEW**
- Risk level: Low / Medium / High
- GitHub OAuth + provider_token flow
- OpenAI key handling
- API route protection
- Real risks in this codebase

**MAINTAINABILITY & DX**
Honest feedback.

**RECOMMENDED IMPROVEMENTS**
Numbered list of 6–8 concrete, high-impact changes. For each item include:
- File & function
- Why it matters
- Exact code suggestion / improved version

Be sharp, specific, and extremely valuable.`
      }]
    });

    return NextResponse.json({
      success: true,
      repo: repoName,
      analysis: message.content[0].type === 'text' ? message.content[0].text : "No response"
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}