import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    // Save GitHub token to profile table so we can use it later
    if (!error && data.session) {
      const token = data.session.provider_token;
      const userId = data.session.user.id;

      if (token) {
        await supabase
          .from('profile')
          .upsert({ user_id: userId, github_token: token }, { onConflict: 'user_id' });
      }
    }
  }

  return NextResponse.redirect(new URL('/dashboard', request.url));
}