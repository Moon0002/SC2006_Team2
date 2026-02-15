'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { estimatePriceFromIndex, extractCategory } from '@/lib/data-gov-sg/transform'

/**
 * Server Action to recalculate estimated_price for all existing records
 * Uses the corrected price estimation logic with item-specific base prices
 * 
 * @returns {Promise<Object>} Result object with success status and statistics
 */
export async function recalculateAllPrices() {
  try {
    const supabase = createAdminClient()
    
    // Step 1: Fetch all existing records
    console.log('Fetching all CPI cache records...')
    const { data: records, error: fetchError } = await supabase
      .from('cpi_cache')
      .select('item_name, cpi_index, category')
    
    if (fetchError) {
      throw fetchError
    }
    
    if (!records || records.length === 0) {
      return {
        success: false,
        error: 'No records found in cpi_cache table',
        stats: {
          total: 0,
          updated: 0,
          errors: 0,
        },
      }
    }
    
    console.log(`Found ${records.length} records to update`)
    
    // Step 2: Recalculate prices for each record
    const updates = []
    let errors = []
    
    for (const record of records) {
      try {
        // Re-extract category (in case it wasn't set correctly before)
        const category = record.category || extractCategory(record.item_name)
        
        // Recalculate price using corrected logic
        const newEstimatedPrice = estimatePriceFromIndex(
          record.cpi_index,
          record.item_name,
          category
        )
        
        updates.push({
          item_name: record.item_name,
          estimated_price: Math.round(newEstimatedPrice * 100) / 100, // Round to 2 decimal places
          category: category, // Update category too in case it was wrong
        })
      } catch (error) {
        console.error(`Error recalculating price for ${record.item_name}:`, error)
        errors.push({
          item_name: record.item_name,
          error: error.message,
        })
      }
    }
    
    console.log(`Recalculated prices for ${updates.length} records`)
    
    // Step 3: Update records in batches
    const batchSize = 100
    let totalUpdated = 0
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)
      
      // Update each record individually (Supabase doesn't support bulk update with different values easily)
      for (const update of batch) {
        const { error: updateError } = await supabase
          .from('cpi_cache')
          .update({
            estimated_price: update.estimated_price,
            category: update.category,
          })
          .eq('item_name', update.item_name)
        
        if (updateError) {
          console.error(`Error updating ${update.item_name}:`, updateError)
          errors.push({
            item_name: update.item_name,
            error: updateError.message,
          })
        } else {
          totalUpdated++
        }
      }
      
      console.log(`Updated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updates.length / batchSize)}`)
      
      // Small delay to avoid rate limits
      if (i + batchSize < updates.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    const stats = {
      total: records.length,
      updated: totalUpdated,
      errors: errors.length,
    }
    
    if (errors.length > 0) {
      return {
        success: false,
        error: `Partial success: ${errors.length} record(s) failed to update`,
        errors: errors.slice(0, 10), // Return first 10 errors
        stats,
      }
    }
    
    console.log('Price recalculation completed successfully')
    return {
      success: true,
      message: `Successfully recalculated prices for ${totalUpdated} records`,
      stats,
    }
  } catch (error) {
    console.error('Error recalculating prices:', error)
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      stats: {
        total: 0,
        updated: 0,
        errors: 0,
      },
    }
  }
}
