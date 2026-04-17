import { syncCpiData } from '@/lib/application/cpi-sync'

export async function POST() {
  try {
    const result = await syncCpiData()
    return Response.json(result, {
      status: result?.success ? 200 : 500,
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error?.message || 'Failed to run CPI sync.',
      },
      { status: 500 }
    )
  }
}
