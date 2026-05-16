import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Allowlist of paths we'll accept as a post-login redirect.
// Anything else — including absolute URLs like https://evil.com — falls back to /dashboard.
const ALLOWED_REDIRECT_PATHS = ['/dashboard', '/profile', '/'];

function getSafeRedirect(next: string | null): string {
  if (!next) return '/dashboard';
  // Reject anything with a protocol or protocol-relative URL
  if (next.includes('://') || next.startsWith('//')) return '/dashboard';
  // Must match one of the allowed paths exactly or as a prefix
  const allowed = ALLOWED_REDIRECT_PATHS.some(
    p => next === p || next.startsWith(p + '/') || next.startsWith(p + '?')
  );
  return allowed ? next : '/dashboard';
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  try {
    // FIX 1: validate the redirect destination before using it
    const safeRedirect = getSafeRedirect(next);
    const response = NextResponse.redirect(new URL(safeRedirect, request.url));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
    }

    // FIX 2 + 3: do NOT save the GitHub token to the profile table.
    //
    // Supabase already stores provider_token encrypted inside the session cookie.
    // Saving it to the DB means:
    //   - it never expires when the user revokes OAuth access
    //   - it's exposed in plain text if the DB is breached
    //
    // Wherever you need the token in the app, read it from the session instead:
    //   const { data: { session } } = await supabase.auth.getSession();
    //   const token = session?.provider_token;

    return response;

  } catch (e) {
    console.error('Callback exception:', e);
    return NextResponse.redirect(new URL('/login?error=callback_failed', request.url));
  }
}