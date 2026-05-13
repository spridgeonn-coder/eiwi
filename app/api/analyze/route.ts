import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { repoFullName, repoName } = await request.json();

    // Fetch repository files
    const filesResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents`, {
      headers: {
        Authorization: `Bearer ${request.headers.get('authorization')?.replace('Bearer ', '')}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let files = [];
    if (filesResponse.ok) {
      files = await filesResponse.json();
    }

    // Prioritize important files (limit to ~12 to avoid token limits)
    const importantExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.cs', '.php'];
    const importantFiles = files
      .filter((f: any) => f.type === 'file' && 
        (importantExtensions.some(ext => f.name.endsWith(ext)) || 
         ['package.json', 'requirements.txt', 'Cargo.toml', 'go.mod'].includes(f.name)))
      .slice(0, 12);

    // Fetch content of important files
    let codeContext = '';
    for (const file of importantFiles) {
      try {
        const contentRes = await fetch(file.download_url);
        if (contentRes.ok) {
          const content = await contentRes.text();
          codeContext += `\n\n--- FILE: ${file.path} ---\n${content}\n`;
        }
      } catch (e) {
        // Skip files we can't fetch
      }
    }

    const prompt = `Repository: ${repoFullName}

Here is the actual code from the most important files:

${codeContext || "No file contents could be retrieved."}

Provide a thorough, expert-level analysis with these exact sections:

**SUMMARY**
A detailed paragraph about what this project does.

**CODE QUALITY RATING**
Start with exactly: **Rating: X/10**
Then explain strengths and weaknesses with specific references to the code.

**SECURITY REVIEW**
Rate risk: Low / Medium / High. List specific issues with file names and code examples.

**PERFORMANCE REVIEW**
Identify bottlenecks and scalability issues with examples.

**BEST PRACTICES & STYLE AUDIT**
Review code style, architecture, and modern practices.

**MISSING TESTS**
Identify untested areas and provide 4-6 high-quality test examples.

**IMPROVEMENTS**
Give 4-6 specific, actionable suggestions with code snippets where helpful.

Be extremely concrete and reference actual files/code when possible.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",   // Change to "gpt-4o" later for even better quality
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
    return NextResponse.json({ 
      error: "Failed to analyze repository",
      details: error.message 
    }, { status: 500 });
  }
}