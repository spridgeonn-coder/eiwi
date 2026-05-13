import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@supabase/ssr';

// Simple in-memory rate limiting (per user, per minute)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // ====================== SERVER-SIDE AUTH CHECK ======================
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized - Please log in" }, { status: 401 });
    }

    // ====================== RATE LIMITING ======================
    const userId = user.id;
    const now = Date.now();
    let record = rateLimit.get(userId) || { count: 0, resetTime: now + 60000 };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + 60000; // 1 minute window
    }

    if (record.count >= 8) { // Max 8 analyzes per minute per user
      return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
    }

    record.count += 1;
    rateLimit.set(userId, record);

    // ====================== NORMAL ANALYSIS ======================
    const { repoFullName, repoName } = await request.json();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) return NextResponse.json({ error: "GitHub token missing" }, { status: 401 });

    // Fetch files
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
        content: `You are a Principal Engineer reviewing code written by a strong senior developer.

Project: ${repoFullName}

REAL CODE FROM THE REPOSITORY:

${codeContext}

Be sharp, specific, and high-signal. Reference exact files and functions. When suggesting changes, give tailored code improvements.

Use these exact sections:

**SUMMARY**
One tight paragraph: What is this product?

**CODE QUALITY RATING**
**Rating: X/10**

**ARCHITECTURE**
Honest assessment.

**SECURITY REVIEW**
- Risk level: Low / Medium / High
- GitHub OAuth + provider_token flow
- OpenAI key handling
- API route protection
- Real risks in this codebase

**MAINTAINABILITY & DX**
Honest feedback.

**RECOMMENDED IMPROVEMENTS**
Prioritized list of 6–8 concrete, high-impact changes. For each one:
- Reference the specific file/function
- Explain why it matters
- Give the exact suggested code improvement

Be sharp and valuable.`
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