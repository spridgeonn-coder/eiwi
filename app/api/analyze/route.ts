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

    // Fetch root files
    const filesResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents`, {
      headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });

    let allFiles: any[] = await filesResponse.json();

    // Also check app/ and lib/ folders if they exist
    for (const dir of ['app', 'lib', 'components']) {
      try {
        const dirRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${dir}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (dirRes.ok) {
          const dirFiles = await dirRes.json();
          allFiles = [...allFiles, ...dirFiles];
        }
      } catch (e) {}
    }

    // Prioritize the most important files
    const priorityFiles = allFiles
      .filter((f: any) => f.type === 'file')
      .sort((a: any, b: any) => {
        const score = (name: string) => {
          if (name.includes('route.ts')) return 100;
          if (name === 'README.md') return 90;
          if (name.includes('supabase')) return 80;
          if (name.includes('page.tsx')) return 70;
          return 0;
        };
        return score(b.name) - score(a.name);
      })
      .slice(0, 22);

    let codeContext = '';

    for (const file of priorityFiles) {
      try {
        const contentRes = await fetch(file.download_url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (contentRes.ok) {
          const content = await contentRes.text();
          codeContext += `\n\n=== ${file.path} ===\n${content.substring(0, 7000)}\n`;
        }
      } catch (e) {}
    }

    const prompt = `You are a principal engineer reviewing production code for a peer senior developer.

Project: ${repoFullName}

Real code from the repo:

${codeContext}

Deliver a **high-value, senior-level review** using these exact sections:

**SUMMARY**
What is this SaaS product actually doing? Be precise.

**CODE QUALITY RATING**
**Rating: X/10** — Justify it.

**ARCHITECTURE**
Strengths and weaknesses of the current structure (App Router, Supabase, etc.).

**SECURITY REVIEW** (Most important section)
- Rate risk: Low / Medium / High
- Specifically analyze GitHub OAuth token flow and provider_token handling
- OpenAI key management
- Any client-side vs server-side risks
- Auth protection on API routes
- Other real risks or good practices you see in the code

**PERFORMANCE & SCALABILITY**
Honest assessment.

**MAINTAINABILITY**
Code organization, TypeScript usage, etc.

**RECOMMENDED IMPROVEMENTS**
Prioritized list of 6-8 concrete, high-impact changes.

Be specific. Reference actual files and code patterns.`;

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