import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@supabase/ssr';

export const maxDuration = 200;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function isValidRepoFullName(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(value);
}

function isValidRepoName(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[a-zA-Z0-9_.-]+$/.test(value) && value.length <= 100;
}

async function fetchDirRecursive(
  repoFullName: string,
  token: string,
  path: string = '',
  depth: number = 0,
  collected: any[] = []
): Promise<any[]> {
  if (depth > 3 || collected.length > 80) return collected;
  try {
    const url = path
      ? `https://api.github.com/repos/${repoFullName}/contents/${path}`
      : `https://api.github.com/repos/${repoFullName}/contents`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return collected;
    const items = await res.json();
    if (!Array.isArray(items)) return collected;

    for (const item of items) {
      if (item.type === 'file') {
        collected.push(item);
      } else if (item.type === 'dir') {
        const skip = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage', 'public', '.husky', 'vendor'];
        if (!skip.includes(item.name)) {
          await fetchDirRecursive(repoFullName, token, item.path, depth + 1, collected);
        }
      }
    }
  } catch (_) {}
  return collected;
}

// Detect the primary language of the repo based on file extensions
function detectLanguage(files: any[]): string {
  const counts: Record<string, number> = {};
  for (const f of files) {
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    counts[ext] = (counts[ext] || 0) + 1;
  }
  const order = ['ts', 'tsx', 'js', 'jsx', 'go', 'py', 'rb', 'rs', 'java', 'cs', 'cpp', 'c', 'php', 'swift', 'kt'];
  for (const ext of order) {
    if (counts[ext]) return ext;
  }
  return 'unknown';
}

// Returns true if the file should be included for analysis based on its extension
function isSourceFile(name: string): boolean {
  const lower = name.toLowerCase();

  // Always include these specific files regardless of extension
  const always = [
    'readme.md', 'package.json', 'go.mod', 'go.sum', 'cargo.toml', 'cargo.lock',
    'requirements.txt', 'pyproject.toml', 'setup.py', 'pom.xml', 'build.gradle',
    'gemfile', 'composer.json', 'makefile', 'dockerfile',
    'next.config.ts', 'next.config.js', 'middleware.ts', 'middleware.js',
    '.env.example',
  ];
  if (always.includes(lower)) return true;

  // Source file extensions — JS/TS ecosystem
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return true;
  if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.mjs')) return true;

  // Go
  if (lower.endsWith('.go')) return true;

  // Python
  if (lower.endsWith('.py')) return true;

  // Ruby
  if (lower.endsWith('.rb')) return true;

  // Rust
  if (lower.endsWith('.rs')) return true;

  // Java / Kotlin
  if (lower.endsWith('.java') || lower.endsWith('.kt')) return true;

  // C# / .NET
  if (lower.endsWith('.cs')) return true;

  // C / C++
  if (lower.endsWith('.c') || lower.endsWith('.cpp') || lower.endsWith('.h') || lower.endsWith('.hpp')) return true;

  // PHP
  if (lower.endsWith('.php')) return true;

  // Swift
  if (lower.endsWith('.swift')) return true;

  // Shell scripts
  if (lower.endsWith('.sh') || lower.endsWith('.bash')) return true;

  // Config files worth reading
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return true;
  if (lower.endsWith('.toml')) return true;

  return false;
}

function isNoisyFile(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes('.test.') ||
    lower.includes('.spec.') ||
    lower.includes('_test.go') ||
    lower.endsWith('.d.ts') ||
    lower.includes('package-lock') ||
    lower.includes('yarn.lock') ||
    lower.includes('.min.js') ||
    lower.includes('.min.css') ||
    lower.endsWith('.pb.go') ||        // protobuf generated
    lower.endsWith('_generated.go') || // generated Go
    lower.endsWith('.generated.ts')    // generated TS
  );
}

export async function POST(request: NextRequest) {
  let logId: string | null = null;
  let supabaseClient: any = null;

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
    );
    supabaseClient = supabase;

    let user;
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      user = data.user;
    } catch {
      return NextResponse.json({ error: "Auth service unavailable" }, { status: 503 });
    }

    let token: string | null = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.provider_token ?? null;
    } catch {}

    if (!token) {
      return NextResponse.json({
        error: "GitHub token missing. Please sign out and reconnect GitHub."
      }, { status: 401 });
    }

    const body = await request.json();
    const { repoFullName, repoName, force } = body;

    if (!isValidRepoFullName(repoFullName)) {
      return NextResponse.json({
        error: "Invalid repository name. Expected format: owner/repo"
      }, { status: 400 });
    }

    if (!isValidRepoName(repoName)) {
      return NextResponse.json({
        error: "Invalid repository name."
      }, { status: 400 });
    }

    // Rate limit — fails closed on any exception
    let canProceed = false;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count, error: countError } = await supabase
        .from('analysis_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      if (countError) throw new Error('Rate limit check failed');
      if ((count ?? 0) >= 10) {
        return NextResponse.json({
          error: "Daily limit reached. You can run 10 analyses per day. Upgrade to Pro for unlimited analyses."
        }, { status: 429 });
      }
      canProceed = true;
    } catch (e) {
      console.error('Rate limit check exception:', e);
    }

    if (!canProceed) {
      return NextResponse.json({
        error: "Rate limit unavailable. Please try again in a few seconds."
      }, { status: 503 });
    }

    // Check cache — skipped when force = true
    if (!force) {
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: cached } = await supabase
          .from('analysis_log')
          .select('result')
          .eq('user_id', user.id)
          .eq('repo_full_name', repoFullName)
          .eq('status', 'complete')
          .gte('created_at', oneHourAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (cached?.result) {
          return NextResponse.json({ ...cached.result, cached: true });
        }
      } catch {}
    }

    // Clean up stale in_progress rows older than 10 minutes
    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      await supabase
        .from('analysis_log')
        .delete()
        .eq('user_id', user.id)
        .eq('repo_full_name', repoFullName)
        .eq('status', 'in_progress')
        .lt('created_at', tenMinutesAgo);
    } catch {}

    try {
      const { data: log, error: insertError } = await supabase
        .from('analysis_log')
        .insert({
          user_id: user.id,
          repo_full_name: repoFullName,
          repo_name: repoName,
          status: 'in_progress',
        })
        .select('id')
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          return NextResponse.json({
            error: "Analysis already in progress. Check back in 30 seconds."
          }, { status: 202 });
        }
        console.error('Failed to insert log:', insertError.message);
      }

      logId = log?.id ?? null;
    } catch (e) {
      console.error('Log insert exception:', e);
    }

    // Validate GitHub token
    try {
      const tokenCheck = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!tokenCheck.ok) {
        if (logId) await supabase.from('analysis_log').update({ status: 'failed' }).eq('id', logId);
        return NextResponse.json({
          error: "GitHub access has been revoked. Please sign out and reconnect your GitHub account.",
          code: "GITHUB_TOKEN_INVALID"
        }, { status: 401 });
      }
    } catch (e) {
      if (logId) await supabase.from('analysis_log').update({ status: 'failed' }).eq('id', logId);
      return NextResponse.json({
        error: "Unable to verify GitHub access. Please try again.",
        code: "GITHUB_TOKEN_CHECK_FAILED"
      }, { status: 503 });
    }

    const allFiles = await fetchDirRecursive(repoFullName, token);

    // Detect repo language so we can prioritize the right files
    const detectedLang = detectLanguage(allFiles);
    console.log(`Detected language: ${detectedLang} for ${repoFullName}`);

    // Language-specific priority paths
    const priorityPaths: Record<string, string[]> = {
      go:   ['cmd', 'internal', 'pkg', 'api', 'handler', 'middleware', 'auth', 'server', 'main', 'config'],
      py:   ['app', 'src', 'api', 'auth', 'middleware', 'models', 'views', 'routes', 'config', 'main'],
      rb:   ['app', 'lib', 'config', 'controllers', 'models', 'middleware'],
      rs:   ['src', 'main', 'lib', 'auth', 'api', 'handler'],
      java: ['src/main', 'controller', 'service', 'auth', 'security', 'config'],
      ts:   ['middleware', 'auth', 'api', 'route', 'supabase', 'config', 'env'],
      tsx:  ['middleware', 'auth', 'api', 'route', 'supabase', 'config', 'env'],
      js:   ['middleware', 'auth', 'api', 'route', 'config', 'env'],
      jsx:  ['middleware', 'auth', 'api', 'route', 'config', 'env'],
    };
    const langPriority = priorityPaths[detectedLang] || ['auth', 'api', 'middleware', 'config', 'main', 'src'];

    const priorityFiles = allFiles
      .filter((f: any) => isSourceFile(f.name))
      .filter((f: any) => !isNoisyFile(f.name))
      .sort((a: any, b: any) => {
        const aScore = langPriority.findIndex(p => a.path.toLowerCase().includes(p));
        const bScore = langPriority.findIndex(p => b.path.toLowerCase().includes(p));
        return (aScore === -1 ? 99 : aScore) - (bScore === -1 ? 99 : bScore);
      })
      .slice(0, 40);

    // FIX: Guard against README-only or empty analysis.
    // Count how many actual source files (non-readme, non-config) were found.
    const actualSourceFiles = priorityFiles.filter((f: any) => {
      const name = f.name.toLowerCase();
      return name !== 'readme.md' && name !== 'package.json' &&
             name !== 'go.mod' && name !== 'go.sum' &&
             name !== 'makefile' && name !== 'dockerfile' &&
             !name.endsWith('.yaml') && !name.endsWith('.yml') &&
             !name.endsWith('.toml') && !name.endsWith('.txt');
    });

    if (actualSourceFiles.length === 0) {
      if (logId) await supabase.from('analysis_log').update({ status: 'failed' }).eq('id', logId);
      logId = null;
      return NextResponse.json({
        error: `No source files found to analyze. eiwi found ${allFiles.length} total files but none matched supported languages (.go, .ts, .js, .py, .rb, .rs, .java, etc). The repository may be empty, documentation-only, or use a language not yet supported.`
      }, { status: 422 });
    }

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

    let analysis = "No analysis generated.";
    let logUpdated = false;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 6000,
        system: [
          {
            type: "text",
            text: `You are a principal engineer at a FAANG company doing a paid code security and architecture audit. Your reviews are legendary for being brutally specific, technically deep, and immediately actionable.

You do not give generic advice. Every single point you make references exact line patterns, exact variable names, and exact file paths from the code provided to you.

You never say things like "add comments", "use useCallback", or "add error handling" unless you can point to the specific place in the code where it is missing and explain the exact production consequence.

If a section has no real issues, skip it entirely — do not include the heading. No padding, no obvious advice, no fluff. A senior engineer reading this should learn something they didn't already know.

When you find issues, you explain the full exploit chain — not just "this is a risk" but exactly how it would be exploited and what the blast radius is.

CRITICAL — AVOID FALSE POSITIVES: Before flagging any issue, carefully check whether a fix is already present in the code. If the vulnerable pattern exists but a mitigation is already implemented — even partially — do not flag it as an open issue. Only report problems where the vulnerable pattern exists AND no mitigation is in place. Credit fixes that are already in place.

CRITICAL FORMATTING RULE: You must use EXACTLY these ## section headings, spelled and spaced exactly as shown. Do not rename them, combine them, or add extra headings:

## Executive Summary
## Critical / High Risks
## Architecture & Design Issues
## Security & Auth Review
## Performance & Reliability
## Code Quality
## Refactoring Priorities
## Quick Wins
## What's Actually Good
## Top Priority Fix
## Scores
## Tech Debt Estimate`,
            cache_control: { type: "ephemeral" }
          }
        ],
        messages: [
          {
            role: "user",
            content: `Do a paid-tier principal engineer audit of this repository. Every observation must reference the exact file and exact code pattern you saw. Do not give advice that isn't directly tied to something you read in the code below.

IMPORTANT: Only flag issues where the vulnerable pattern exists and no fix is already implemented. If you see a fix already in place, acknowledge it in "What's Actually Good" instead of flagging it as an issue.

Repository: ${repoFullName}
Primary language detected: ${detectedLang}
Files reviewed: ${priorityFiles.map((f: any) => f.path).join(', ')}

CODE:
${codeContext || "Could not fetch files."}

---

Use EXACTLY these ## section headings in this order. Skip any section that has no real findings.

## Executive Summary
2-3 sentences max. Name the single biggest actual threat. Reference real file names and variable names you saw.

## Critical / High Risks
For each issue found, use this format. Only include issues where NO fix is already present:

### 1. [Short title of the issue]
- **Risk level:** Critical | High
- **File + pattern:** Exact file and the specific code pattern
- **Attack vector:** How would an attacker exploit this right now, concretely?
- **Production impact:** What specifically breaks, gets exposed, or goes down?
- **Fix:** The exact code change needed. Include actual code snippets in fenced code blocks where helpful.

## Architecture & Design Issues
Same ### numbered format. Skip entirely if no real issues found.

## Security & Auth Review
Deep analysis of auth flows, token handling, session management. Credit mitigations already in place.

## Performance & Reliability
Only include if you found real bottlenecks. Skip if clean.

## Code Quality
One paragraph with specific examples justifying the score.

## Refactoring Priorities
Numbered list, highest production risk first. Name exact file and specific change.

## Quick Wins
Max 3 items. Name the exact file, the exact current code, and the exact replacement.

## What's Actually Good
Name fixes and patterns already well-implemented. Be specific.

## Top Priority Fix
File: [exact filename]
Issue: [one specific sentence]
Fix: [one sentence with the exact implementation change]

## Scores
Quality: [0-100]
Security: [0-100]
Performance: [0-100]
BlastRadius: [0-99]
TechDebt: [8-120]

## Tech Debt Estimate
Hours: [same number as TechDebt above]
Reason: [one sentence naming specific files and changes still needed]`
          }
        ],
      });

      analysis = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      console.log('Claude token usage:', {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        cacheRead: (response.usage as any).cache_read_input_tokens ?? 0,
        cacheCreated: (response.usage as any).cache_creation_input_tokens ?? 0,
      });

      const scoresSection = analysis.match(/## Scores\s*([\s\S]*?)(?=\n##\s|$)/i)?.[1] || '';
      const qualityMatch = scoresSection.match(/Quality:\s*(\d+)/i);
      const securityMatch = scoresSection.match(/Security:\s*(\d+)/i);
      const performanceMatch = scoresSection.match(/Performance:\s*(\d+)/i);
      const blastRadiusMatch = scoresSection.match(/BlastRadius:\s*(\d+)/i);
      const techDebtMatch = scoresSection.match(/TechDebt:\s*(\d+)/i);

      const qualityScore = qualityMatch ? parseInt(qualityMatch[1]) : 70;
      const security = securityMatch ? parseInt(securityMatch[1]) : 70;
      const performance = performanceMatch ? parseInt(performanceMatch[1]) : 70;
      const blastRadius = blastRadiusMatch ? Math.min(99, parseInt(blastRadiusMatch[1])) : 20;
      const techDebt = techDebtMatch ? parseInt(techDebtMatch[1]) : 20;

      const topFixFileMatch = analysis.match(/## Top Priority Fix[\s\S]*?File:\s*([^\n]+)/i);
      const topFixIssueMatch = analysis.match(/## Top Priority Fix[\s\S]*?Issue:\s*([^\n]+)/i);
      const topFixRecommendationMatch = analysis.match(/## Top Priority Fix[\s\S]*?Fix:\s*([^\n]+)/i);

      const topPriorityFix = {
        file: topFixFileMatch?.[1]?.trim() || 'See full analysis',
        issue: topFixIssueMatch?.[1]?.trim() || 'Critical issue detected — view full analysis for details',
        fix: topFixRecommendationMatch?.[1]?.trim() || 'See recommendations in the Analysis tab',
      };

      const scannedFiles = priorityFiles.map((f: any) => {
        const name = f.path;
        const lowerAnalysis = analysis.toLowerCase();
        const lowerName = name.toLowerCase();
        const nameIndex = lowerAnalysis.indexOf(lowerName);
        const surroundingText = nameIndex !== -1
          ? lowerAnalysis.slice(Math.max(0, nameIndex - 150), nameIndex + 300)
          : '';
        const isCritical = surroundingText.includes('critical');
        const isReview = surroundingText.includes('high') || surroundingText.includes('risk') || surroundingText.includes('vulnerability');
        return {
          path: name,
          status: isCritical ? 'Critical' : isReview ? 'Review' : 'Clean',
        };
      }).slice(0, 6);

      const result = {
        success: true,
        repo: repoName,
        analysis,
        structured: {
          qualityScore,
          blastRadius,
          security,
          performance,
          techDebt,
          topPriorityFix,
          scannedFiles,
        }
      };

      if (logId) {
        const { error: updateError } = await supabase
          .from('analysis_log')
          .update({
            status: 'complete',
            result,
            completed_at: new Date().toISOString(),
          })
          .eq('id', logId);

        if (updateError) console.error('Failed to update log:', updateError.message);
        else logUpdated = true;
      }

      return NextResponse.json(result);

    } catch (claudeError: any) {
      console.error('Claude analysis failed:', claudeError);
      if (logId && supabaseClient) {
        await supabaseClient.from('analysis_log').update({ status: 'failed' }).eq('id', logId);
        logUpdated = true;
      }
      return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });

    } finally {
      if (logId && supabaseClient && !logUpdated) {
        try {
          const { data } = await supabaseClient
            .from('analysis_log')
            .select('status')
            .eq('id', logId)
            .single();
          if (data?.status === 'in_progress') {
            await supabaseClient.from('analysis_log').delete().eq('id', logId);
          }
        } catch {}
      }
    }

  } catch (error: any) {
    if (logId && supabaseClient) {
      try {
        await supabaseClient.from('analysis_log').update({ status: 'failed' }).eq('id', logId);
      } catch {}
    }
    console.error("Analyze Error:", error);
    return NextResponse.json({ error: error.message || "Analysis failed" }, { status: 500 });
  }
}