'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAllCpiData } from '@/lib/data-gov-sg/client'
import { transformCpiRecords } from '@/lib/data-gov-sg/transform'

/**
 * Server Action to sync CPI data from Data.gov.sg to Supabase
 * This action fetches, transforms, and upserts CPI data into the cpi_cache table
 * 
 * @returns {Promise<Object>} Result object with success status and statistics
 */
export async function syncCpiData() {
  try {
    // Step 1: Fetch data from Data.gov.sg
    console.log('Fetching CPI data from Data.gov.sg...')
    // Use smaller batches and longer delays to avoid rate limits
    const rawRecords = await fetchAllCpiData({
      batchSize: 50, // Smaller batches
      delayBetweenBatches: 2000, // 2 second delay between batches
    })
    
    if (!rawRecords || rawRecords.length === 0) {
      return {
        success: false,
        error: 'No records fetched from Data.gov.sg API',
        stats: {
          fetched: 0,
          transformed: 0,
          upserted: 0,
        },
      }
    }

    console.log(`Fetched ${rawRecords.length} records from Data.gov.sg`)

    // Step 2: Transform records to match schema
    console.log('Transforming records...')
    const transformedRecords = transformCpiRecords(rawRecords)
    
    if (transformedRecords.length === 0) {
      return {
        success: false,
        error: 'No valid records after transformation',
        stats: {
          fetched: rawRecords.length,
          transformed: 0,
          upserted: 0,
        },
      }
    }

    console.log(`Transformed ${transformedRecords.length} records`)

    // Step 3: Upsert to Supabase using admin client (bypasses RLS)
    console.log('Upserting to Supabase...')
    const supabase = createAdminClient()
    
    // Upsert in batches to avoid payload size limits
    const batchSize = 100
    let totalUpserted = 0
    let errors = []

    for (let i = 0; i < transformedRecords.length; i += batchSize) {
      const batch = transformedRecords.slice(i, i + batchSize)
      
      const { data, error } = await supabase
        .from('cpi_cache')
        .upsert(batch, {
          onConflict: 'item_name', // Use item_name as the conflict resolution key
          ignoreDuplicates: false,
        })

      if (error) {
        console.error(`Error upserting batch ${i / batchSize + 1}:`, error)
        errors.push({
          batch: i / batchSize + 1,
          error: error.message,
        })
      } else {
        totalUpserted += batch.length
        console.log(`Upserted batch ${i / batchSize + 1}/${Math.ceil(transformedRecords.length / batchSize)}`)
      }
    }

    const stats = {
      fetched: rawRecords.length,
      transformed: transformedRecords.length,
      upserted: totalUpserted,
      errors: errors.length,
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: `Partial success: ${errors.length} batch(es) failed`,
        errors: errors,
        stats,
      }
    }

    console.log('CPI data sync completed successfully')
    return {
      success: true,
      message: `Successfully synced ${totalUpserted} CPI records`,
      stats,
    }
  } catch (error) {
    console.error('Error syncing CPI data:', error)
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      stats: {
        fetched: 0,
        transformed: 0,
        upserted: 0,
      },
    }
  }
}

/**
 * Server Action to get sync status
 * Checks how many records are in the cache and when they were last updated
 * 
 * @returns {Promise<Object>} Status information
 */
export async function getCpiSyncStatus() {
  try {
    const supabase = createAdminClient()
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('cpi_cache')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      throw countError
    }

    // Get latest update timestamp
    const { data: latest, error: latestError } = await supabase
      .from('cpi_cache')
      .select('last_updated')
      .order('last_updated', { ascending: false })
      .limit(1)
      .single()

    return {
      success: true,
      totalRecords: count || 0,
      lastUpdated: latest?.[0]?.last_updated || null,
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    }
  }
}
