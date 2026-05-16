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

  // FIX: Use getSession() instead of getUser() in middleware.
  // getUser() makes a network call to Supabase auth on every request.
  // getSession() reads the session from the cookie locally — no network call,
  // no latency, no risk of hanging if Supabase is slow.
  // We still keep the timeout as a safety net for the cookie parsing itself.
  let user = null;
  try {
    const { data, error } = await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), 3000)
      ),
    ]);
    if (!error) user = data.session?.user ?? null;
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