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

    // Get key files
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

    const prompt = `You are a senior security engineer reviewing a real SaaS application.

Project: ${repoFullName}

Here is the actual code from the repository:

${codeContext}

Perform a **detailed, specific security review** using these exact sections:

**SUMMARY**
Briefly describe what this project is.

**CODE QUALITY RATING**
**Rating: X/10**

**SECURITY REVIEW** (This section is critical)
- Rate overall security risk: Low / Medium / High
- Specifically analyze how authentication works (Supabase + GitHub OAuth)
- Check how API keys and tokens (OpenAI, GitHub provider_token) are handled
- Look for any sensitive data exposure risks
- Mention specific files and code patterns (e.g. route.ts, supabase client, token passing)
- Point out real strengths and weaknesses in this codebase

**PERFORMANCE REVIEW**
Any notable observations.

**BEST PRACTICES & STYLE**
Honest feedback.

**MISSING TESTS**
Gaps and examples.

**IMPROVEMENTS**
5-7 concrete, actionable suggestions.

Be critical and reference actual files and code you see.`;

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