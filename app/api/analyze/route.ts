import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { repoFullName, repoName } = await request.json();

    // Get GitHub token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: "GitHub token missing" }, { status: 401 });
    }

    // Fetch repo files
    const filesResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!filesResponse.ok) {
      return NextResponse.json({ error: "Could not access repository files" }, { status: filesResponse.status });
    }

    const files = await filesResponse.json();

    // Get important code files
    const importantFiles = files
      .filter((f: any) => f.type === 'file' && 
        /\.(js|ts|jsx|tsx|py|java|go|rs|cs|php|rb|swift)$/.test(f.name))
      .slice(0, 12);

    let codeContext = '';

    for (const file of importantFiles) {
      try {
        const contentRes = await fetch(file.download_url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (contentRes.ok) {
          const content = await contentRes.text();
          codeContext += `\n\n--- ${file.path} ---\n${content.substring(0, 6000)}\n`;
        }
      } catch (e) {}
    }

    const prompt = `You are a senior software engineer doing a deep code review.

Repository: ${repoFullName}

Here is real code from the repository:

${codeContext || "No code files found."}

Give a professional, detailed analysis using these exact sections:

**SUMMARY**
What this project is and its main purpose.

**CODE QUALITY RATING**
**Rating: X/10**
Honest score with reasons.

**SECURITY REVIEW**
Any real security issues or good practices.

**PERFORMANCE REVIEW**
Performance observations.

**BEST PRACTICES & STYLE**
Code style and architecture feedback.

**MISSING TESTS**
Gaps and example tests.

**IMPROVEMENTS**
Concrete suggestions with code examples.

Be specific and mention file names.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
    });

    return NextResponse.json({
      success: true,
      repo: repoName,
      analysis: completion.choices[0]?.message?.content || "No response from AI"
    });

  } catch (error: any) {
    console.error("Analyze error:", error);
    return NextResponse.json({ 
      error: "Analysis failed", 
      details: error.message 
    }, { status: 500 });
  }
}