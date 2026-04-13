import { calculateFareBetweenPostalCodes } from '@/app/actions/transit-fare'

const DEFAULT_FARE = 2.0

/**
 * GET: Calculate transit fare between two postal codes
 * Query params: origin, destination
 * 
 * POST: Calculate transit fare between two postal codes (distance-tier approximation)
 * Body: { origin, destination }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const origin = searchParams.get('origin')
    const destination = searchParams.get('destination')

    if (!origin || !destination) {
      return Response.json(
        { success: false, error: 'Missing origin or destination postal code' },
        { status: 400 }
      )
    }

    const result = await calculateFareBetweenPostalCodes(origin, destination)

    // Always return 200 with result, even if calculation failed (result has success: false)
    return Response.json(result, {
      status: 200,
    })
  } catch (error) {
    console.error('Transit fare API error:', error)
    return Response.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        fare: DEFAULT_FARE,
        method: 'fallback',
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { origin, destination } = body

    if (!origin || !destination) {
      return Response.json(
        { success: false, error: 'Missing origin or destination postal code' },
        { status: 400 }
      )
    }

    const result = await calculateFareBetweenPostalCodes(origin, destination)

    return Response.json(result, {
      status: result.success ? 200 : 500,
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        fare: DEFAULT_FARE,
        method: 'fallback',
      },
      { status: 500 }
    )
  }
}
