import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const isProtectedPath =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/profile')

  // FIX: getUser() makes a network call to Supabase on every request.
  // With no timeout, a Supabase outage hangs middleware for 30s then returns
  // a 504 — taking down every protected route site-wide.
  // We race it against 3 seconds and redirect gracefully if auth is unavailable.
  let user = null;
  try {
    const { data, error } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), 3000)
      ),
    ]);
    if (!error) user = data.user;
  } catch (err) {
    console.error('Auth check failed:', err);
    if (isProtectedPath) {
      return NextResponse.redirect(
        new URL('/login?error=auth_unavailable', request.url)
      );
    }
  }

  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*'],
}