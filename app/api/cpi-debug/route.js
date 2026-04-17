import { fetchCpiData } from '@/lib/integrations/data-gov-sg/client'

/**
 * Debug endpoint to inspect raw API data structure
 */
export async function GET() {
  try {
    // Fetch just 3 records to see the structure
    const result = await fetchCpiData({ limit: 3, offset: 0 })
    
    return Response.json({
      success: true,
      sampleRecords: result.records,
      recordCount: result.records.length,
      firstRecordKeys: result.records[0] ? Object.keys(result.records[0]) : [],
      firstRecord: result.records[0] || null,
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
