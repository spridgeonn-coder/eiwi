import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url));
  }

  try {
    const response = NextResponse.redirect(new URL(next, request.url));

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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
    }

    // Save GitHub token to profile table
    if (data.session) {
      const token = data.session.provider_token;
      const userId = data.session.user.id;

      if (token && userId) {
        try {
          await supabase
            .from('profile')
            .upsert(
              { user_id: userId, github_token: token },
              { onConflict: 'user_id' }
            );
        } catch (e) {
          console.error('Failed to save GitHub token:', e);
        }
      }
    }

    return response;

  } catch (e) {
    console.error('Callback exception:', e);
    return NextResponse.redirect(new URL('/login?error=callback_failed', request.url));
  }
}