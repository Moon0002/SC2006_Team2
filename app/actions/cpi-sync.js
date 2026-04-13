'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchAllCpiData } from '@/lib/data-gov-sg/client'

const MONTH_KEY_REGEX = /^\d{4}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i
const MONTH_INDEX = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function parseMonthKey(monthKey) {
  const match = String(monthKey || '').match(
    /^(\d{4})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i
  )
  if (!match) return null

  const year = Number(match[1])
  const monthIdx = MONTH_INDEX[match[2].toLowerCase()]
  if (!Number.isFinite(year) || monthIdx == null) return null

  return {
    monthKey: `${year}${match[2][0].toUpperCase()}${match[2].slice(1, 3).toLowerCase()}`,
    sortValue: year * 12 + monthIdx,
  }
}

function extractLatestIndexFromRecord(record) {
  let best = null

  for (const key of Object.keys(record || {})) {
    if (!MONTH_KEY_REGEX.test(key)) continue

    const parsedMonth = parseMonthKey(key)
    if (!parsedMonth) continue

    const rawValue = record[key]
    const value = Number(rawValue)
    if (!Number.isFinite(value)) continue

    if (!best || parsedMonth.sortValue > best.sortValue) {
      best = {
        monthKey: parsedMonth.monthKey,
        sortValue: parsedMonth.sortValue,
        index: value,
      }
    }
  }

  return best
}

function buildLatestCpiMap(records) {
  const bySeries = new Map()

  for (const record of records || []) {
    const seriesName = record?.DataSeries || record?.['Data Series'] || record?.data_series
    const normalizedSeries = normalizeKey(seriesName)
    if (!normalizedSeries) continue

    const latest = extractLatestIndexFromRecord(record)
    if (!latest) continue

    const existing = bySeries.get(normalizedSeries)
    if (!existing || latest.sortValue > existing.sortValue) {
      bySeries.set(normalizedSeries, latest)
    }
  }

  return bySeries
}

async function loadCategorySeriesMap(supabase) {
  const { data, error } = await supabase
    .from('cpi_series_map')
    .select('category_name, data_series, is_active')
    .eq('is_active', true)

  if (error) {
    // Keep sync resilient even if mapping table has not been created yet.
    return {
      map: new Map(),
      warning: `Could not read cpi_series_map; falling back to direct category match. ${error.message}`,
    }
  }

  const map = new Map()
  for (const row of data || []) {
    const categoryKey = normalizeKey(row.category_name)
    const seriesKey = normalizeKey(row.data_series)
    if (!categoryKey || !seriesKey) continue
    map.set(categoryKey, seriesKey)
  }

  return { map, warning: null }
}

/**
 * Server Action to sync CPI data from Data.gov.sg to Supabase
 * and update `public.singstat_data.cpi_index` by matching:
 * singstat_data.category_name <-> Data.gov.sg DataSeries
 * 
 * @returns {Promise<Object>} Result object with success status and statistics
 */
export async function syncCpiData() {
  try {
    const supabase = await createClient()

    const records = await fetchAllCpiData()
    const cpiBySeries = buildLatestCpiMap(records)
    const { map: categorySeriesMap, warning: mappingWarning } =
      await loadCategorySeriesMap(supabase)

    if (cpiBySeries.size === 0) {
      return {
        success: false,
        error: 'No valid CPI records returned from Data.gov.sg.',
      }
    }

    const { data: rows, error: fetchError } = await supabase
      .from('singstat_data')
      .select('item_id, data_series, category_name, cpi_index')
      .order('item_id', { ascending: true })

    if (fetchError) {
      throw new Error(`Failed to fetch singstat_data: ${fetchError.message}`)
    }

    const matched = []
    const unmatched = []
    let mappedByTable = 0
    let matchedByFallback = 0
    for (const row of rows || []) {
      const categoryKey = normalizeKey(row.category_name)
      if (!categoryKey) {
        unmatched.push({
          item_id: row.item_id,
          data_series: row.data_series,
          category_name: row.category_name,
          reason: 'empty category_name',
        })
        continue
      }

      const mappedSeriesKey = categorySeriesMap.get(categoryKey)
      const sourceSeriesKey = mappedSeriesKey || categoryKey
      const cpi = cpiBySeries.get(sourceSeriesKey)
      if (!cpi) {
        unmatched.push({
          item_id: row.item_id,
          data_series: row.data_series,
          category_name: row.category_name,
          mapped_data_series: mappedSeriesKey || null,
          reason: mappedSeriesKey
            ? 'mapped DataSeries not found in Data.gov.sg dataset'
            : 'no direct DataSeries match (consider adding cpi_series_map override)',
        })
        continue
      }

      if (mappedSeriesKey) {
        mappedByTable++
      } else {
        matchedByFallback++
      }

      matched.push({
        item_id: row.item_id,
        category_name: row.category_name,
        matched_data_series: sourceSeriesKey,
        previous_cpi_index:
          row.cpi_index == null ? null : Number(row.cpi_index),
        next_cpi_index: cpi.index,
        source_month: cpi.monthKey,
      })
    }

    const updateErrors = []
    let updated = 0
    let unchanged = 0

    for (const item of matched) {
      const prev = item.previous_cpi_index
      const next = item.next_cpi_index
      const isSame =
        Number.isFinite(prev) &&
        Math.abs(prev - next) < 0.0005

      if (isSame) {
        unchanged++
        continue
      }

      const { error: updateError } = await supabase
        .from('singstat_data')
        .update({ cpi_index: next })
        .eq('item_id', item.item_id)

      if (updateError) {
        updateErrors.push({
          item_id: item.item_id,
          error: updateError.message,
        })
        continue
      }

      updated++
    }

    const latestMatchedMonth = matched
      .map((m) => parseMonthKey(m.source_month))
      .filter(Boolean)
      .sort((a, b) => b.sortValue - a.sortValue)[0]?.monthKey || null

    return {
      success: updateErrors.length === 0,
      source: 'data.gov.sg',
      datasetId: 'd_bdaff844e3ef89d39fceb962ff8f0791',
      latestMatchedMonth,
      totalGovSeries: cpiBySeries.size,
      totalRowsInSingstatData: (rows || []).length,
      matchedRows: matched.length,
      mappedByTable,
      matchedByFallback,
      updatedRows: updated,
      unchangedRows: unchanged,
      unmatchedRows: unmatched.length,
      unmatchedSample: unmatched.slice(0, 10),
      warnings: mappingWarning ? [mappingWarning] : [],
      updateErrors,
    }
  } catch (error) {
    return {
      success: false,
      error: error?.message || 'Unknown CPI sync failure.',
    }
  }
}

/**
 * Server Action to get sync status
 * for singstat_data CPI values.
 * 
 * @returns {Promise<Object>} Status information
 */
export async function getCpiSyncStatus() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('singstat_data')
      .select('item_id, cpi_index')

    if (error) {
      throw new Error(error.message)
    }

    const total = (data || []).length
    const withCpi = (data || []).filter((row) => row.cpi_index != null).length
    const withoutCpi = total - withCpi

    return {
      success: true,
      enabled: true,
      source: 'public.singstat_data',
      totalRows: total,
      rowsWithCpiIndex: withCpi,
      rowsWithoutCpiIndex: withoutCpi,
      message:
        'CPI sync is enabled. Run syncCpiData() to refresh cpi_index from Data.gov.sg.',
    }
  } catch (error) {
    return {
      success: false,
      enabled: true,
      error: error?.message || 'Unable to read CPI sync status.',
    }
  }
}
