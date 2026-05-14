import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@supabase/ssr';

const rateLimit = new Map<string, { count: number; resetTime: number }>();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Analyze API started");

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });

    // Rate limit
    const userId = user.id;
    const now = Date.now();
    let record = rateLimit.get(userId) || { count: 0, resetTime: now + 60000 };
    if (now > record.resetTime) record = { count: 0, resetTime: now + 60000 };
    if (record.count >= 5) return NextResponse.json({ error: "Too many requests. Wait 60 seconds." }, { status: 429 });
    record.count++;
    rateLimit.set(userId, record);

    const { repoFullName, repoName, mode = 'normal' } = await request.json();

    // Get GitHub token
    let token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      const { data: profile } = await supabase.from('profile').select('github_token').eq('user_id', user.id).single();
      token = profile?.github_token;
    }
    if (!token) return NextResponse.json({ error: "GitHub token missing. Reconnect in Profile." }, { status: 401 });

    // === FILE FETCHING (limited to avoid timeout) ===
    const importantDirs = ['', 'app', 'lib', 'components'];
    let allFiles: any[] = [];

    for (const dir of importantDirs) {
      try {
        const url = dir ? `https://api.github.com/repos/${repoFullName}/contents/${dir}` : `https://api.github.com/repos/${repoFullName}/contents`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          allFiles = [...allFiles, ...(Array.isArray(data) ? data : [data])];
        }
      } catch (_) {}
    }

    const priorityFiles = allFiles
      .filter((f: any) => f.type === 'file' && (f.name.endsWith('.ts') || f.name.endsWith('.tsx') || f.name.endsWith('.js')))
      .slice(0, 20); // Keep it small to avoid timeouts

    let codeContext = '';
    for (const file of priorityFiles) {
      try {
        const res = await fetch(file.download_url, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          let content = await res.text();
          if (content.length > 8000) content = content.slice(0, 8000) + "\n// ... truncated";
          codeContext += `\n\n=== ${file.path} ===\n${content}\n`;
        }
      } catch (_) {}
    }

    if (codeContext.length < 100) {
      codeContext = "No code files found or could not access repository.";
    }

    // === AI ANALYSIS ===
    let analysisText = "Analysis failed to generate content.";

    try {
      const model = "claude-sonnet-4-6";

      if (mode === '10star') {
        const message = await anthropic.messages.create({
          model,
          max_tokens: 3500,
          temperature: 0.4,
          messages: [{ role: "user", content: `Project: ${repoFullName}\n\nCode:\n${codeContext}\n\nGive a detailed senior-level review.` }]
        });
        analysisText = message.content[0]?.type === 'text' ? message.content[0].text : '';
      } else {
        const message = await anthropic.messages.create({
          model,
          max_tokens: 2200,
          temperature: 0.3,
          messages: [{ 
            role: "user", 
            content: `Review this project as a senior engineer:\n\n${codeContext}\n\nUse sections: ## Executive Summary, ## Strengths, ## Code Quality & Architecture, ## Security & Performance, ## Key Issues, ## Quick Wins.` 
          }]
        });
        analysisText = message.content[0]?.type === 'text' ? message.content[0].text : '';
      }
    } catch (aiError: any) {
      console.error("AI Error:", aiError);
      analysisText = `AI call failed: ${aiError.message || 'Unknown error'}. This is likely a temporary issue with Anthropic.`;
    }

    return NextResponse.json({
      success: true,
      repo: repoName,
      analysis: analysisText,
      mode,
    });

  } catch (error: any) {
    console.error("❌ Full API Error:", error);
    return NextResponse.json({ error: error.message || "Server error occurred" }, { status: 500 });
  }
}