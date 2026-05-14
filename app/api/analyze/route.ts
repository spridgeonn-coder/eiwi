import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@supabase/ssr';

// In-memory rate limiting (fine for MVP)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: "Unauthorized — please log in" }, { status: 401 });
    }

    // Rate limiting
    const userId = user.id;
    const now = Date.now();
    let record = rateLimit.get(userId) || { count: 0, resetTime: now + 60000 };
    if (now > record.resetTime) {
      record = { count: 0, resetTime: now + 60000 };
    }
    if (record.count >= 8) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
    }
    record.count += 1;
    rateLimit.set(userId, record);

    const { repoFullName, repoName, mode = 'normal' } = await request.json();

    // === TOKEN HANDLING (with refresh support) ===
    let token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      const { data: profile } = await supabase
        .from('profile')
        .select('github_token, github_refresh_token')
        .eq('user_id', user.id)
        .single();
      token = profile?.github_token || null;
    }

    if (!token) {
      return NextResponse.json({ error: "GitHub token missing. Please reconnect in Profile." }, { status: 401 });
    }

    // === IMPROVED FILE FETCHING ===
    const importantDirs = [
      '', 'app', 'lib', 'components', 'src', 'utils', 'hooks', 'api', 'config'
    ];

    let allFiles: any[] = [];

    for (const dir of importantDirs) {
      try {
        const url = dir
          ? `https://api.github.com/repos/${repoFullName}/contents/${dir}`
          : `https://api.github.com/repos/${repoFullName}/contents`;

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const files = Array.isArray(data) ? data : [data];
          allFiles = [...allFiles, ...files];
        }
      } catch (_) {}
    }

    // Prioritize highest value files
    const priorityFiles = allFiles
      .filter((f: any) => f.type === 'file' && 
        (f.name.endsWith('.tsx') || 
         f.name.endsWith('.ts') || 
         f.name.endsWith('.js') || 
         f.name === 'README.md' ||
         f.name.includes('package.json')))
      .sort((a: any, b: any) => {
        const score = (name: string) => {
          if (name.includes('route.ts') || name.includes('api/')) return 500;
          if (name.includes('page.tsx')) return 400;
          if (name.includes('supabase')) return 350;
          if (name.includes('dashboard')) return 300;
          if (name === 'README.md') return 250;
          if (name.includes('layout')) return 200;
          return 50;
        };
        return score(b.name) - score(a.name);
      })
      .slice(0, 35); // Reduced to avoid token limits

    let codeContext = '';

    for (const file of priorityFiles) {
      try {
        const contentRes = await fetch(file.download_url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (contentRes.ok) {
          let content = await contentRes.text();
          if (content.length > 15000) content = content.substring(0, 15000) + "\n// ... (truncated)";
          codeContext += `\n\n=== ${file.path} ===\n${content}\n`;
        }
      } catch (_) {}
    }

    // === STRONGER PROMPTS ===
    let analysisText = '';

    if (mode === '10star') {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4500,
        temperature: 0.4,
        messages: [{
          role: "user",
          content: `You are a Principal Engineer at a top-tier company.

Project: ${repoFullName}

Here is the most important code from the repository:
${codeContext}

Write a **high-signal, senior-level** code review that would impress a staff engineer.

Use clear ## markdown sections. Be opinionated, specific, and actionable.
Reference exact files and suggest concrete improvements with code examples where helpful.`
        }]
      });
      analysisText = message.content[0].type === 'text' ? message.content[0].text : "No response";

    } else {
      // Normal Analyze - this is the one we care about most
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2800,
        temperature: 0.3,
        messages: [{
          role: "user",
          content: `You are a senior/full-stack engineer reviewing code for another mid-to-senior developer.

Project: ${repoFullName}

Code context:
${codeContext}

Write a professional, high-value code review using **exactly** these sections with ## headers:

## Executive Summary
2-3 sentences about what the project is and its overall quality.

## Strengths
What is done well.

## Code Quality & Architecture
Rating (X/10) and detailed explanation. Talk about structure, patterns, maintainability.

## Security & Performance
Any concerns or wins.

## Key Issues & Refactoring Opportunities
Prioritized list. For each item: file + specific suggestion + why it matters.

## Quick Wins
Small, high-impact changes that would improve the project immediately.

Be concise but insightful. Use markdown tables when helpful. Never hallucinate files.`
        }]
      });
      analysisText = message.content[0].type === 'text' ? message.content[0].text : "No response";
    }

    return NextResponse.json({
      success: true,
      repo: repoName,
      analysis: analysisText,
      mode,
    });

  } catch (error: any) {
    console.error('[analyze]', error);
    return NextResponse.json({ 
      error: error.message || "Analysis failed. Please try again." 
    }, { status: 500 });
  }
}