'use server'

/**
 * Deprecated: `cpi_cache` is no longer used.
 * Prices are sourced from `public.singstat_data`.
 */
export async function recalculateAllPrices() {
  return {
    success: false,
    error:
      'recalculate-prices is deprecated because `cpi_cache` is no longer used. Prices come from `public.singstat_data`.',
  }
}
