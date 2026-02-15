import { calculateFareBetweenPostalCodes, calculateFareWithTransitNodes } from '@/app/actions/transit-fare'

/**
 * GET: Calculate transit fare between two postal codes
 * Query params: origin, destination
 * 
 * POST: Calculate fare with transit node details
 * Body: { origin, destination, useTransitNodes?: boolean }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const origin = searchParams.get('origin')
    const destination = searchParams.get('destination')
    const useTransitNodes = searchParams.get('useTransitNodes') === 'true'

    if (!origin || !destination) {
      return Response.json(
        { success: false, error: 'Missing origin or destination postal code' },
        { status: 400 }
      )
    }

    const result = useTransitNodes
      ? await calculateFareWithTransitNodes(origin, destination)
      : await calculateFareBetweenPostalCodes(origin, destination)

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
        fare: 2.00,
        method: 'fallback',
      },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { origin, destination, useTransitNodes = false } = body

    if (!origin || !destination) {
      return Response.json(
        { success: false, error: 'Missing origin or destination postal code' },
        { status: 400 }
      )
    }

    const result = useTransitNodes
      ? await calculateFareWithTransitNodes(origin, destination)
      : await calculateFareBetweenPostalCodes(origin, destination)

    return Response.json(result, {
      status: result.success ? 200 : 500,
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        fare: 2.00,
        method: 'fallback',
      },
      { status: 500 }
    )
  }
}
