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

    // Fetch files
    const filesResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents`, {
      headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });

    const files = await filesResponse.json();

    // Get as many relevant files as possible
    const keyFiles = files
      .filter((f: any) => f.type === 'file')
      .slice(0, 25);

    let codeContext = '';

    for (const file of keyFiles) {
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

    const prompt = `You are a **principal engineer** at a top-tier company doing a serious code review for a fellow senior developer.

Project: ${repoFullName}

Here is the actual code from the repository:

${codeContext}

Write a high-signal, no-fluff review targeted at mid-to-senior engineers. Use these exact sections:

**SUMMARY**
One paragraph: What is this project actually building? What problem does it solve?

**CODE QUALITY RATING**
**Rating: X/10**
Be direct. Justify the score with specific observations from the code.

**ARCHITECTURE & DESIGN**
Evaluate folder structure, separation of concerns, use of Next.js App Router, Supabase integration, etc.

**SECURITY REVIEW**
Rate risk: Low / Medium / High
- How are GitHub OAuth tokens handled?
- Are API keys (OpenAI, etc.) properly isolated server-side?
- Any auth bypass risks, token leakage, or missing validation?
- Rate limiting / abuse prevention?
- Specific strengths and weaknesses in this codebase.

**PERFORMANCE & SCALABILITY**
Realistic concerns for production use.

**BEST PRACTICES & MAINTAINABILITY**
Code style, TypeScript usage, error handling, testing strategy, etc.

**MISSING TESTS**
What should be tested? Give 3-5 concrete test examples.

**RECOMMENDED IMPROVEMENTS**
Prioritized list of 5-8 actionable changes with clear value.

Be critical, specific, and reference actual files/patterns you see.`;

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