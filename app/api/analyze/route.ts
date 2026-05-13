import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { repoFullName, repoName } = await request.json();

    const prompt = `Repository: ${repoFullName}

Analyze this repo thoroughly and provide a structured response with these exact sections:

**SUMMARY**
One detailed paragraph about what this project does and its main purpose.

**CODE QUALITY RATING**
Start with exactly: **Rating: X/10** (X = number 1-10)
Then explain strengths and weaknesses.

**SECURITY REVIEW**
Rate overall security risk: Low / Medium / High. List specific risks with examples.

**PERFORMANCE REVIEW**
Point out potential bottlenecks and scalability issues.

**BEST PRACTICES & STYLE AUDIT**
Review code style, naming, error handling, and modern practices.

**MISSING TESTS**
Identify which parts of the code are likely missing tests. Then provide 4-6 high-quality, ready-to-use test examples (with full code blocks) that would cover the most important untested areas.

**IMPROVEMENTS**
Give 3-5 specific, actionable suggestions with code examples.

Be extremely detailed and concrete. Use real file names and code patterns when possible.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    });

    return NextResponse.json({
      success: true,
      repo: repoName,
      analysis: completion.choices[0]?.message?.content || "No response"
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed to analyze" }, { status: 500 });
  }
}