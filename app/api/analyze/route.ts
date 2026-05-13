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

    // Fetch all files
    const filesResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents`, {
      headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });

    const files = await filesResponse.json();

    // Get key files (especially config, main files, README)
    const keyFiles = files
      .filter((f: any) => f.type === 'file')
      .slice(0, 20);

    let codeContext = '';

    for (const file of keyFiles) {
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

    const prompt = `You are an expert full-stack engineer reviewing a real GitHub repository.

Repository Name: ${repoFullName}

Here is the actual code and structure from the project:

${codeContext}

Write a **professional, accurate** analysis with these exact sections:

**SUMMARY**
Give a clear, accurate description of what this project actually is and does. Be specific about its purpose and main features.

**CODE QUALITY RATING**
**Rating: X/10** (be honest)
Explain why you gave that score with references to specific files.

**SECURITY REVIEW**
Rate risk level and list any real issues.

**PERFORMANCE REVIEW**
Any notable performance observations.

**BEST PRACTICES & STYLE**
Honest feedback on code organization and style.

**MISSING TESTS**
What tests are missing and give 3-5 example tests.

**IMPROVEMENTS**
4-6 concrete, actionable suggestions.

Stay grounded in the actual code you see.`;

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