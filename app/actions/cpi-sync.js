'use server'

/**
 * Server Action to sync CPI data from Data.gov.sg to Supabase
 * This action fetches, transforms, and upserts CPI data into the cpi_cache table
 * 
 * @returns {Promise<Object>} Result object with success status and statistics
 */
export async function syncCpiData() {
  return {
    success: false,
    error:
      'CPI sync has been disabled. This project now uses `public.singstat_data` as the single source of item prices (no `cpi_cache`).',
  }
}

/**
 * Server Action to get sync status
 * Checks how many records are in the cache and when they were last updated
 * 
 * @returns {Promise<Object>} Status information
 */
export async function getCpiSyncStatus() {
  return {
    success: true,
    enabled: false,
    message:
      'CPI sync is disabled. Prices are loaded from `public.singstat_data`.',
  }
}
