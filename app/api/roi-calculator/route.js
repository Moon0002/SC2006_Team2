import { calculateTripROI } from '@/app/actions/roi-calculator'

/**
 * POST: Calculate ROI for a grocery trip
 * Body: {
 *   basketItems: [{ item_id, quantity }],
 *   originPostalCode: string,
 *   destinationPostalCode: string,
 *   martChain?: string,
 *   hourlyRate?: number,
 *   travelTimeHours?: number,
 *   userId?: string
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      basketItems,
      originPostalCode,
      destinationPostalCode,
      martChain,
      hourlyRate,
      travelTimeHours,
      userId,
    } = body

    if (!basketItems || !Array.isArray(basketItems) || basketItems.length === 0) {
      return Response.json(
        { success: false, error: 'Basket items are required' },
        { status: 400 }
      )
    }

    if (!originPostalCode || !destinationPostalCode) {
      return Response.json(
        { success: false, error: 'Origin and destination postal codes are required' },
        { status: 400 }
      )
    }

    const result = await calculateTripROI({
      basketItems,
      originPostalCode,
      destinationPostalCode,
      martChain,
      hourlyRate,
      travelTimeHours,
      userId,
    })

    return Response.json(result, {
      status: result.success ? 200 : 500,
    })
  } catch (error) {
    console.error('ROI calculator API error:', error)
    return Response.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
