import { syncCpiData, getCpiSyncStatus } from '@/app/actions/cpi-sync'

/**
 * GET: Get CPI sync status
 * POST: Trigger CPI data sync
 */
export async function GET() {
  try {
    const status = await getCpiSyncStatus()
    return Response.json(status)
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    const result = await syncCpiData()
    
    // Always return 200 with the result, even if sync failed
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
