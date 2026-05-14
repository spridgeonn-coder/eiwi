import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerClient } from '@supabase/ssr';

export const maxDuration = 120;   // Important for Vercel

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { repoFullName, repoName } = await request.json();

    let token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      const { data: profile } = await supabase.from('profile').select('github_token').eq('user_id', user.id).single();
      token = profile?.github_token;
    }
    if (!token) return NextResponse.json({ error: "GitHub token missing" }, { status: 401 });

    // Simple file fetch (one main file to keep it fast)
    let codeContext = "Could not fetch repository files.";
    try {
      const res = await fetch(`https://api.github.com/repos/${repoFullName}/contents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const files = await res.json();
        const mainFile = files.find((f: any) => f.name.endsWith('.tsx') || f.name.endsWith('.ts') || f.name === 'README.md');
        if (mainFile) {
          const contentRes = await fetch(mainFile.download_url, { headers: { Authorization: `Bearer ${token}` } });
          if (contentRes.ok) {
            let content = await contentRes.text();
            if (content.length > 10000) content = content.slice(0, 10000);
            codeContext = `File: ${mainFile.path}\n\n${content}`;
          }
        }
      }
    } catch (_) {}

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: "You are a senior software engineer giving clear, actionable code reviews."
        },
        {
          role: "user",
          content: `Review this repository: ${repoFullName}\n\nCode:\n${codeContext}\n\nUse these exact markdown sections:\n## Executive Summary\n## Strengths\n## Code Quality\n## Key Issues\n## Quick Wins`
        }
      ],
    });

    const analysis = completion.choices[0]?.message?.content || "No analysis generated.";

    return NextResponse.json({
      success: true,
      repo: repoName,
      analysis,
    });

  } catch (error: any) {
    console.error("Analyze Error:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze" }, { status: 500 });
  }
}