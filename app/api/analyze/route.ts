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

    // Prioritize important files
    const priorityFiles = files
      .filter((f: any) => f.type === 'file')
      .sort((a: any, b: any) => {
        if (a.name === 'README.md') return -1;
        if (b.name === 'README.md') return 1;
        return 0;
      })
      .slice(0, 18);

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

    const prompt = `You are a senior full-stack engineer doing a thorough code review.

Project: ${repoFullName}

Here is the actual structure and code from the repository:

${codeContext}

Analyze this **real project** and write a clear, professional review using these exact sections:

**SUMMARY**
Give a concise but accurate description of what this project actually is, its main purpose, and key features. Base it on the code and files you see.

**CODE QUALITY RATING**
**Rating: X/10**
Be honest. Explain your rating with references to specific files or patterns.

**SECURITY REVIEW**
Rate: Low / Medium / High risk
Mention any real concerns (API keys, auth, dependencies, etc.) or good practices.

**PERFORMANCE REVIEW**
Any obvious performance issues or good patterns.

**BEST PRACTICES & STYLE**
Honest feedback on code organization, naming, architecture.

**MISSING TESTS**
What tests are missing? Provide 3-5 realistic test examples.

**IMPROVEMENTS**
Give 5-7 concrete, actionable suggestions with code snippets where helpful.

Stay grounded in what you actually see in the files.`;

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