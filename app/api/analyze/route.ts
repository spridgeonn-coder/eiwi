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

    // Fetch from multiple important directories
    const directories = ['', 'app', 'lib', 'components', 'app/api', 'app/dashboard'];
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

    // Prioritize the most valuable files
    const priorityFiles = allFiles
      .filter((f: any) => f.type === 'file')
      .sort((a: any, b: any) => {
        const score = (name: string) => {
          if (name.includes('route.ts')) return 100;
          if (name.includes('supabase')) return 95;
          if (name === 'README.md') return 90;
          if (name.includes('dashboard')) return 85;
          if (name.includes('page.tsx')) return 80;
          if (name.includes('analyze')) return 75;
          return 50;
        };
        return score(b.name) - score(a.name);
      })
      .slice(0, 28);

    let codeContext = '';

    for (const file of priorityFiles) {
      try {
        const contentRes = await fetch(file.download_url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (contentRes.ok) {
          const content = await contentRes.text();
          codeContext += `\n\n=== ${file.path} ===\n${content.substring(0, 6500)}\n`;
        }
      } catch (e) {}
    }

    const prompt = `You are a **Principal Engineer** (ex-Stripe / Vercel level) giving a serious, no-BS code review to a peer senior developer.

Project: ${repoFullName}

Real code from the repository:

${codeContext}

Write a high-value, actionable review using these exact sections:

**SUMMARY**
One tight, accurate paragraph: What is this SaaS product? Who is it for? What is its core value proposition?

**CODE QUALITY RATING**
**Rating: X/10**
Be honest and justify it.

**ARCHITECTURE**
Evaluate the overall structure, Next.js App Router usage, Supabase integration, and separation of concerns.

**SECURITY REVIEW**
- Overall risk level: Low / Medium / High
- GitHub OAuth + provider_token flow (client → server)
- OpenAI key handling and server-side safety
- Auth protection on API routes
- Any real risks or strong practices you see in the code
- Specific file references

**PERFORMANCE & SCALABILITY**
Realistic production concerns.

**MAINTAINABILITY & DEVELOPER EXPERIENCE**
Code organization, TypeScript usage, error handling, onboarding, etc.

**RECOMMENDED IMPROVEMENTS**
Prioritized list of 6–8 concrete, high-impact suggestions with clear business/value reasoning.

Be critical, specific, and reference actual files and patterns you see. No generic advice.`;

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