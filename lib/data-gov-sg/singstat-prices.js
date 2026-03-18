/**
 * SingStat price loader (Supabase)
 * Loads a lookup table of item_name -> price from the Supabase DB.
 *
 * Expected schema (from `supabase/singstat_data.sql`):
 * - table: singstat_data (or SingStat_Data depending on how it was created)
 * - columns: data_series (text), price_2026_jan (numeric)
 */

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * In-memory cache to avoid hitting Supabase repeatedly during CPI sync.
 * Note: This cache resets on server restart / serverless cold start.
 */
let _cache = {
  loadedAtMs: 0,
  ttlMs: 6 * 60 * 60 * 1000, // 6 hours
  map: null,
}

function normalizeKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

async function tryLoadFromTable(supabase, tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('data_series, price_2026_jan')

  if (error) {
    return { ok: false, error }
  }

  const map = new Map()
  for (const row of data || []) {
    const key = normalizeKey(row.data_series)
    const price = row.price_2026_jan == null ? null : Number(row.price_2026_jan)
    if (!key || !Number.isFinite(price)) continue
    map.set(key, price)
  }

  return { ok: true, map }
}

/**
 * Loads (and caches) SingStat prices from Supabase.
 * @param {Object} [options]
 * @param {boolean} [options.forceRefresh] bypass cache
 * @returns {Promise<Map<string, number>>} normalized item name -> price
 */
export async function getSingStatPriceMap({ forceRefresh = false } = {}) {
  const now = Date.now()
  if (!forceRefresh && _cache.map && now - _cache.loadedAtMs < _cache.ttlMs) {
    return _cache.map
  }

  const supabase = createAdminClient()

  // Postgres folds unquoted identifiers to lowercase, so CREATE TABLE SingStat_Data
  // typically becomes `singstat_data`. Try both to be safe.
  const attempts = ['singstat_data', 'SingStat_Data']

  let lastError = null
  for (const tableName of attempts) {
    const result = await tryLoadFromTable(supabase, tableName)
    if (result.ok) {
      _cache = { ..._cache, loadedAtMs: now, map: result.map }
      return result.map
    }
    lastError = result.error
  }

  throw new Error(
    `Failed to load SingStat prices from Supabase (tried: ${attempts.join(
      ', '
    )}). ${lastError?.message || lastError || ''}`.trim()
  )
}

