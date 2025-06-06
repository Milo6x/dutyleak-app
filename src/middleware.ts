import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { type Database } from './lib/database.types'

export async function middleware(request: NextRequest) {
  // Create response early to avoid recreating it multiple times
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  let supabase
  try {
    supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
        set(name: string, value: string, options: CookieOptions) {
          // Only set cookies if they don't already exist with the same value
          const existingCookie = request.cookies.get(name)?.value
          if (existingCookie !== value) {
            response.cookies.set({
              name,
              value,
              ...options,
              path: options.path || '/'
            })
          }
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: '',
            ...options,
            path: options.path || '/',
            maxAge: 0
          })
        },
      },
    }
  )
  } catch (cookieError) {
    console.error('Middleware cookie parsing error:', cookieError)
    
    // Clear corrupted cookies and redirect to login
    const response = NextResponse.redirect(new URL('/auth/login', request.url))
    
    // Clear all Supabase-related cookies
    const cookieNames = [
      'sb-access-token', 
      'sb-refresh-token', 
      'supabase-auth-token',
      'sb-auth-token',
      'supabase.auth.token'
    ]
    
    cookieNames.forEach(name => {
      response.cookies.set(name, '', { 
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
    })
    
    return response
  }

  // Get current pathname for efficient route checking
  const pathname = request.nextUrl.pathname
  
  // Skip auth check for static files and API routes
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/') || pathname === '/favicon.ico') {
    return response
  }

  // Define route patterns for efficient matching
  const protectedRoutes = ['/dashboard', '/products', '/analytics', '/settings', '/admin']
  const authRoutes = ['/auth/login', '/auth/signup', '/auth/forgot-password', '/auth/reset-password']
  
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  const isRootRoute = pathname === '/'

  // Only get session if we need it for route protection
  let session = null
  if (isProtectedRoute || isAuthRoute || isRootRoute) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      session = user ? { user } : null
    } catch {
      // If session check fails, treat as no session
      session = null
    }
  }

  // Handle route redirects based on authentication state
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (isAuthRoute && session) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  if (isRootRoute) {
    const targetUrl = session ? '/dashboard' : '/auth/login'
    return NextResponse.redirect(new URL(targetUrl, request.url))
  }

  // Set security headers only for HTML responses
  const isHtmlRequest = request.headers.get('accept')?.includes('text/html')
  
  if (isHtmlRequest) {
    const isDev = process.env.NODE_ENV !== 'production'
    const cspHeader = [
      "default-src 'self'",
      `script-src 'self' ${isDev ? "'unsafe-eval'" : ""} 'unsafe-inline'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      `connect-src 'self' https: ${isDev ? 'ws: wss:' : ''}`,
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join('; ')
    
    response.headers.set('Content-Security-Policy', cspHeader)
  }
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     * - public assets (images, fonts, etc.)
     */
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|api|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2|ttf|eot)$).*)',
  ],
}