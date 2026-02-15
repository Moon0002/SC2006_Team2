import { NextResponse } from 'next/server'
import { geocodePostalCode } from '@/lib/geocoding/google'

/**
 * Test endpoint for geocoding API
 * Tests the REST API geocoding to verify API key and permissions
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const postalCode = searchParams.get('postalCode') || '639798'

  try {
    const result = await geocodePostalCode(postalCode)
    
    return NextResponse.json({
      success: true,
      postalCode,
      result,
      message: 'Geocoding API is working correctly',
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        troubleshooting: [
          '1. Verify NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set in .env',
          '2. Go to Google Cloud Console: https://console.cloud.google.com/apis/library',
          '3. Enable "Geocoding API" for your project',
          '4. Check API key restrictions in Google Cloud Console',
          '5. Ensure billing is enabled for your Google Cloud project',
          '6. Wait a few minutes after enabling the API for changes to propagate',
        ],
      },
      { status: 500 }
    )
  }
}
