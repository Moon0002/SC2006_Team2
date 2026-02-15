import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * OAuth Callback Route
 * Handles the redirect from Google OAuth and email confirmation links
 */
export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')

  const supabase = await createClient()

  // Handle email confirmation
  if (token_hash && type === 'email') {
    const { error } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash,
    })

    if (!error) {
      // Email confirmed successfully
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Handle OAuth callback
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      // If there's an error, redirect to login with error message
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('error', 'Failed to authenticate')
      return NextResponse.redirect(loginUrl)
    }
  }

  // Redirect to the requested page or home
  return NextResponse.redirect(new URL(next, request.url))
}
