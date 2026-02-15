import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Logout Route
 * Signs out the user and redirects to home
 */
export async function POST(request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(new URL('/', request.url))
}
