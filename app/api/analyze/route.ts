import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { repoFullName, repoName } = await request.json();

    // Get session token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: "No GitHub token" }, { status: 401 });
    }

    // Fetch files
    const filesResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!filesResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch repo files" }, { status: filesResponse.status });
    }

    const files = await filesResponse.json();

    // Get important files
    const importantFiles = files
      .filter((f: any) => f.type === 'file')
      .slice(0, 15); // Limit to avoid token limits

    let codeContext = '';

    for (const file of importantFiles) {
      try {
        const contentRes = await fetch(file.download_url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (contentRes.ok) {
          const content = await contentRes.text();
          codeContext += `\n\n--- ${file.path} ---\n${content.substring(0, 8000)}\n`; // Limit size
        }
      } catch (e) {}
    }

    const prompt = `You are an expert senior software engineer.

Repository: ${repoFullName}

Here is actual code from the repository:

${codeContext || "No code could be retrieved."}

Provide a high-quality, expert-level analysis using these exact sections:

**SUMMARY**
Detailed overview of what this project is and does.

**CODE QUALITY RATING**
**Rating: X/10** (be honest)
Explain strengths and weaknesses with specific file references.

**SECURITY REVIEW**
Rate: Low / Medium / High
List real issues with file paths and code snippets.

**PERFORMANCE REVIEW**
Real performance concerns and bottlenecks.

**BEST PRACTICES & STYLE AUDIT**
Honest feedback on code style and architecture.

**MISSING TESTS**
Identify gaps and give 4-6 concrete test examples.

**IMPROVEMENTS**
4-6 actionable suggestions with code examples.

Be critical and specific.`;

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
    console.error("Analyze error:", error);
    return NextResponse.json({ 
      error: "Analysis failed", 
      details: error.message 
    }, { status: 500 });
  }
}