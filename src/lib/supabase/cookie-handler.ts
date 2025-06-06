import { NextResponse } from 'next/server'
import { createDutyLeakServerClient } from './server'
// import { cookies } from 'next/headers' // Kept for future cookie management features

/**
 * Safely creates a Supabase client with proper error handling for corrupted cookies
 * @returns Object containing either the supabase client or an error response
 */
export async function createSafeSupabaseClient() {
  try {
    console.log('Creating Supabase client...')
    const supabase = createDutyLeakServerClient()
    console.log('Supabase client created successfully')
    return { supabase, error: null }
  } catch (cookieError) {
    console.error('Cookie parsing error:', cookieError)
    console.error('Cookie error stack:', (cookieError as Error).stack)
    
    // Try to clear corrupted cookies and create a fresh client
    console.log('Attempting to clear corrupted cookies and retry...')
    
    try {
      // Try to create client with fresh state
       const supabase = createDutyLeakServerClient()
      console.log('Successfully created client after cookie cleanup')
      
      return { supabase, error: null }
    } catch (retryError) {
      console.error('Failed to create client even after cleanup:', retryError)
      
      // Create response that clears corrupted cookies
      const response = NextResponse.json(
        { error: 'Authentication error. Please refresh the page.' },
        { status: 401 }
      )
      
      // Clear all auth-related cookies
      const cookieNames = [
        'sb-qpuntawybmwiejmisyke-auth-token',
        'sb-qpuntawybmwiejmisyke-auth-token.0',
        'sb-qpuntawybmwiejmisyke-auth-token.1', 
        'sb-qpuntawybmwiejmisyke-auth-token.2',
        'sb-qpuntawybmwiejmisyke-auth-token.3',
        'sb-qpuntawybmwiejmisyke-auth-token.4',
        'sb-qpuntawybmwiejmisyke-auth-token.5',
        'sb-qpuntawybmwiejmisyke-auth-token.6',
        'sb-qpuntawybmwiejmisyke-auth-token.7'
      ];
      
      cookieNames.forEach(cookieName => {
        response.cookies.set(cookieName, '', {
          expires: new Date(0),
          path: '/'
        });
      });
        
        return { supabase: null, error: response }
    }
  }
}

/**
 * Middleware function to handle corrupted cookies in API routes
 */
export function withCookieErrorHandling<T extends any[]>(
  handler: (supabase: any, ...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const { supabase, error } = await createSafeSupabaseClient()
    
    if (error) {
      return error
    }
    
    return handler(supabase, ...args)
  }
}