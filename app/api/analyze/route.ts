import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@supabase/ssr';

// Rate limiting (per user, per minute)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    // Server-side authentication
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

    // Basic rate limiting
    const userId = user.id;
    const now = Date.now();
    let record = rateLimit.get(userId) || { count: 0, resetTime: now + 60000 };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + 60000;
    }

    if (record.count >= 10) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
    }

    record.count += 1;
    rateLimit.set(userId, record);

    const { repoFullName, repoName, mode = 'normal' } = await request.json();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) return NextResponse.json({ error: "GitHub token missing" }, { status: 401 });

    // Fetch repository files
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

    let analysisText = '';

    if (mode === '10star') {
      // Claude for deep, high-quality 10-star analysis
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        temperature: 0.5,
        messages: [{
          role: "user",
          content: `You are a Principal Engineer giving a high-signal review.

Project: ${repoFullName}

REAL CODE:

${codeContext}

Give a senior-level roadmap to turn this into a 10-star project. Be specific and reference exact files.`
        }]
      });
      analysisText = message.content[0].type === 'text' ? message.content[0].text : "No response";
    } else {
      // GPT-4o-mini for fast, normal analysis
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: `You are a senior engineer reviewing this repository.

Project: ${repoFullName}

REAL CODE:

${codeContext}

**SUMMARY**
One tight paragraph.

**CODE QUALITY RATING**
**Rating: X/10**

**SECURITY REVIEW**
Risk level and real issues.

**RECOMMENDED IMPROVEMENTS**
Prioritized list with specific, actionable suggestions.`
        }],
        temperature: 0.5,
      });
      analysisText = completion.choices[0]?.message?.content || "No response";
    }

    return NextResponse.json({
      success: true,
      repo: repoName,
      analysis: analysisText,
      mode
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}