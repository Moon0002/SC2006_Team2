import { NextResponse } from 'next/server'

/**
 * Check if API key is accessible (for debugging)
 */
export async function GET() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  return NextResponse.json({
    hasKey: !!apiKey,
    keyLength: apiKey ? apiKey.length : 0,
    keyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'N/A',
    message: apiKey 
      ? 'API key is configured. Make sure to restart dev server after changing .env'
      : 'API key is NOT configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env file',
    note: 'This is a server-side check. Client-side code should also have access via NEXT_PUBLIC_ prefix.',
  })
}
