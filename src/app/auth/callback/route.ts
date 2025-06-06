import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard'

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(new URL('/auth/login?error=auth_callback_error', requestUrl.origin))
      }
      
      // Successful authentication - redirect to intended destination
      return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
    } catch (error) {
      console.error('Unexpected auth callback error:', error)
      return NextResponse.redirect(new URL('/auth/login?error=unexpected_error', requestUrl.origin))
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(new URL('/auth/login?error=no_code', requestUrl.origin))
}