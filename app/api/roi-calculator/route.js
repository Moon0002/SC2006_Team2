import { calculateTripROI } from '@/lib/application/roi-calculator'
import {
  isValidPostalCode,
  isValidHourlyRate,
  validateBasketItemsForROI,
} from '@/lib/utils/validation'

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

    const basketCheck = validateBasketItemsForROI(basketItems)
    if (!basketCheck.ok) {
      return Response.json(
        { success: false, error: basketCheck.error },
        { status: 400 }
      )
    }

    if (!originPostalCode || !destinationPostalCode) {
      return Response.json(
        { success: false, error: 'Origin and destination postal codes are required' },
        { status: 400 }
      )
    }

    const originDigits = String(originPostalCode).replace(/\D/g, '')
    const destDigits = String(destinationPostalCode).replace(/\D/g, '')
    if (!isValidPostalCode(originDigits) || !isValidPostalCode(destDigits)) {
      return Response.json(
        { success: false, error: 'Please enter a valid 6-digit postal code.' },
        { status: 400 }
      )
    }

    if (
      hourlyRate != null &&
      hourlyRate !== '' &&
      !isValidHourlyRate(Number(hourlyRate))
    ) {
      return Response.json(
        { success: false, error: 'Hourly rate must be a number zero or greater.' },
        { status: 400 }
      )
    }

    const result = await calculateTripROI({
      basketItems: basketCheck.items,
      originPostalCode: originDigits,
      destinationPostalCode: destDigits,
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
