import { recalculateAllPrices } from '@/app/actions/recalculate-prices'

/**
 * GET: Get recalculation status (placeholder)
 * POST: Trigger price recalculation for all existing records
 */
export async function GET() {
  return Response.json({
    message: 'Use POST to trigger price recalculation',
    endpoint: '/api/recalculate-prices',
    method: 'POST',
  })
}

export async function POST() {
  try {
    const result = await recalculateAllPrices()
    
    // Always return 200 with the result, even if recalculation failed
    // The result object contains success: false and error details
    return Response.json(result, {
      status: 200,
    })
  } catch (error) {
    console.error('API route error:', error)
    return Response.json(
      { 
        success: false, 
        error: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        details: error.toString(),
      },
      { status: 500 }
    )
  }
}
