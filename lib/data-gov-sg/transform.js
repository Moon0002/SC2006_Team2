/**
 * Data Transformation and Normalization
 * Converts raw Data.gov.sg CPI API records into the application schema
 */

/**
 * Extracts a specific month's CPI index value from a record
 * @param {Object} record - Raw API record with monthly columns
 * @param {string} targetMonth - Optional: specific month to extract (format: '2025-12' or 'latest')
 * @returns {Object} Month data { month: '2025-12', index: 105.2 }
 */
function getLatestMonthData(record, targetMonth = 'latest') {
  // Find all month columns - format is "2025Dec", "2025Nov", etc. (no space)
  const monthColumns = Object.keys(record).filter(key => {
    // Skip non-month fields
    if (key === 'DataSeries' || key === 'Data Series' || key === 'data_series' || key === '_id') {
      return false
    }
    // Match pattern: YYYYMMM (e.g., "2025Dec", "2024Nov")
    return /^\d{4}(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i.test(key)
  })

  if (monthColumns.length === 0) {
    return null
  }

  // If targetMonth is specified (format: '2025-12'), find that specific month
  if (targetMonth !== 'latest') {
    const [targetYear, targetMonthNum] = targetMonth.split('-')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const targetMonthName = monthNames[parseInt(targetMonthNum) - 1]
    const targetKey = `${targetYear}${targetMonthName}`
    
    if (monthColumns.includes(targetKey)) {
      const valueStr = record[targetKey]
      if (valueStr && valueStr !== 'na' && valueStr !== 'NA' && valueStr.trim() !== '') {
        const indexValue = parseFloat(valueStr)
        if (!isNaN(indexValue)) {
          return {
            month: targetMonth,
            index: indexValue,
            monthKey: targetKey,
          }
        }
      }
    }
    // If target month not found or invalid, fall back to latest
  }

  // Sort by year and month to get the latest
  const sortedMonths = monthColumns.sort((a, b) => {
    // Format is "2025Dec", extract year and month
    const matchA = a.match(/^(\d{4})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i)
    const matchB = b.match(/^(\d{4})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i)
    
    if (!matchA || !matchB) return 0
    
    const yearA = parseInt(matchA[1])
    const yearB = parseInt(matchB[1])
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthIndexA = monthNames.indexOf(matchA[2])
    const monthIndexB = monthNames.indexOf(matchB[2])
    
    if (yearA !== yearB) {
      return yearB - yearA // Descending year
    }
    return monthIndexB - monthIndexA // Descending month
  })

  const latestMonthKey = sortedMonths[0]
  
  // Values are strings, parse them
  const valueStr = record[latestMonthKey]
  
  // Skip "na" values
  if (!valueStr || valueStr === 'na' || valueStr === 'NA' || valueStr.trim() === '') {
    return null
  }
  
  const indexValue = parseFloat(valueStr)

  if (isNaN(indexValue) || indexValue === null || indexValue === undefined) {
    return null
  }

  // Convert "2025Dec" format to "2025-12"
  // Format is: YYYYMMM (e.g., "2025Dec")
  const match = latestMonthKey.match(/^(\d{4})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i)
  
  if (!match) {
    return null
  }
  
  const year = match[1]
  const monthName = match[2]
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthName.toLowerCase())
  
  if (monthIndex === -1) {
    return null
  }
  
  const monthFormatted = String(monthIndex + 1).padStart(2, '0')
  const dataMonth = `${year}-${monthFormatted}`

  return {
    month: dataMonth,
    index: indexValue,
    monthKey: latestMonthKey,
  }
}

/**
 * Item-specific base prices (2024 base year prices in SGD)
 * These are estimated average prices for common grocery items in Singapore
 * CPI index 100 = these base prices
 * When index changes, price = basePrice * (index / 100)
 */
const ITEM_BASE_PRICES = {
  // Bread & Bakery
  'white bread': 2.50,
  'wholemeal bread': 3.00,
  'bread': 2.50,
  
  // Dairy
  'fresh milk': 4.50,
  'milk': 4.50,
  'uht milk': 3.50,
  'eggs': 3.50,
  'chicken eggs': 3.50,
  'cheese': 8.00,
  
  // Grains & Rice
  'rice': 6.00,
  'white rice': 6.00,
  'jasmine rice': 7.00,
  
  // Meat
  'chicken': 8.00,
  'chicken meat': 8.00,
  'beef': 15.00,
  'pork': 12.00,
  'pork meat': 12.00,
  
  // Seafood
  'fish': 10.00,
  'fresh fish': 10.00,
  
  // Vegetables
  'tomato': 4.00,
  'tomatoes': 4.00,
  'onion': 2.50,
  'onions': 2.50,
  'potato': 3.00,
  'potatoes': 3.00,
  'cabbage': 2.00,
  'lettuce': 3.50,
  
  // Pantry
  'cooking oil': 5.00,
  'vegetable oil': 5.00,
  'sugar': 2.50,
  'salt': 1.50,
  'flour': 3.00,
  
  // Beverages
  'coffee': 8.00,
  'tea': 5.00,
  'soft drinks': 2.50,
  
  // Other common items
  'banana': 2.50,
  'bananas': 2.50,
  'apple': 1.50,
  'apples': 1.50,
  
  // Services (for reference - these shouldn't be in grocery basket)
  'hotel': 150.00, // Average hotel room per night
  'accommodation': 150.00,
  'restaurant': 25.00, // Average meal
  'transport': 2.00, // Average bus/MRT fare
}

/**
 * Category-based fallback prices (average prices for categories)
 */
const CATEGORY_FALLBACK_PRICES = {
  'Bakery': 2.50,
  'Dairy': 4.00,
  'Grains': 6.00,
  'Meat': 10.00,
  'Seafood': 10.00,
  'Vegetables': 3.00,
  'Pantry': 3.50,
  'Other': 5.00,
}

/**
 * Estimates price from CPI index using item-specific base prices
 * CPI indices are relative to base year (2024 = 100), not absolute prices
 * @param {number} cpiIndex - CPI index value
 * @param {string} itemName - Item name to look up base price
 * @param {string} category - Item category for fallback
 * @returns {number} Estimated price in SGD
 */
export function estimatePriceFromIndex(cpiIndex, itemName = '', category = 'Other') {
  // Find matching base price for this item
  const itemNameLower = itemName.toLowerCase().trim()
  let basePrice = null
  
  // Try exact match first
  if (ITEM_BASE_PRICES[itemNameLower]) {
    basePrice = ITEM_BASE_PRICES[itemNameLower]
  } else {
    // Try partial match (e.g., "White Bread" matches "white bread")
    for (const [key, price] of Object.entries(ITEM_BASE_PRICES)) {
      if (itemNameLower.includes(key) || key.includes(itemNameLower)) {
        basePrice = price
        break
      }
    }
  }
  
  // Fallback to category-based price
  if (!basePrice) {
    basePrice = CATEGORY_FALLBACK_PRICES[category] || CATEGORY_FALLBACK_PRICES['Other']
  }
  
  // Calculate price: basePrice * (index / 100)
  // If index is 100, price = basePrice
  // If index is 105, price = basePrice * 1.05 (5% increase)
  const baseIndex = 100.0
  return (cpiIndex / baseIndex) * basePrice
}

/**
 * Extracts category from item name or Data Series
 * @param {string} itemName - Item name from Data Series
 * @returns {string} Category name
 */
export function extractCategory(itemName) {
  // Simple category extraction based on keywords
  // You may want to enhance this with a more sophisticated mapping
  const categoryMap = {
    'Bread': 'Bakery',
    'Milk': 'Dairy',
    'Egg': 'Dairy',
    'Rice': 'Grains',
    'Chicken': 'Meat',
    'Beef': 'Meat',
    'Pork': 'Meat',
    'Fish': 'Seafood',
    'Tomato': 'Vegetables',
    'Onion': 'Vegetables',
    'Oil': 'Pantry',
    'Sugar': 'Pantry',
  }

  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (itemName.toLowerCase().includes(keyword.toLowerCase())) {
      return category
    }
  }

  return 'Other'
}

/**
 * Generates a unique item ID from item name
 * @param {string} itemName - Item name
 * @returns {string} Item ID
 */
function generateItemId(itemName) {
  // Create a simple ID from the item name
  // You may want to use a hash or UUID instead
  return itemName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Transforms a raw CPI API record into the application schema
 * @param {Object} record - Raw API record
 * @param {string} targetMonth - Optional: specific month to extract (format: '2025-12' or 'latest')
 * @returns {Object|null} Transformed record matching cpi_cache schema, or null if invalid
 */
export function transformCpiRecord(record, targetMonth = 'latest') {
  try {
    // Extract Data Series (item name) - field is "DataSeries"
    const dataSeries = record['DataSeries']
    
    if (!dataSeries || typeof dataSeries !== 'string' || dataSeries.trim() === '') {
      // Skip records without valid DataSeries
      return null
    }
    
    // Skip aggregate categories like "All Items", "Food", etc.
    const trimmedName = dataSeries.trim()
    
    // Skip "All Items" aggregate
    if (trimmedName === 'All Items') {
      return null
    }
    
    // Skip records with leading spaces (these are category headers, not individual items)
    // Check the original string, not the trimmed one
    if (dataSeries.startsWith('    ') || dataSeries.startsWith('\t')) {
      return null
    }

    // Get latest month data (or specific month if targetMonth is provided)
    const monthData = getLatestMonthData(record, targetMonth)
    
    if (!monthData) {
      console.warn(`No valid month data found for item: ${dataSeries}`)
      return null
    }

    // Generate item ID
    const itemId = generateItemId(dataSeries)

    // Extract category first (needed for price estimation)
    const category = extractCategory(dataSeries)

    // Estimate price from CPI index using item-specific base prices
    const estimatedPrice = estimatePriceFromIndex(monthData.index, dataSeries.trim(), category)

    // Build transformed record matching cpi_cache schema
    return {
      item_name: dataSeries.trim(),
      item_id: itemId,
      cpi_index: monthData.index,
      estimated_price: Math.round(estimatedPrice * 100) / 100, // Round to 2 decimal places
      data_month: monthData.month,
      category: category,
      is_price_estimated: true,
      last_updated: new Date().toISOString(),
      data_source: 'data.gov.sg',
      raw_data: record, // Store full record for reference
    }
  } catch (error) {
    console.error('Error transforming CPI record:', error, record)
    return null
  }
}

/**
 * Transforms an array of raw CPI records
 * @param {Array<Object>} records - Array of raw API records
 * @returns {Array<Object>} Array of transformed records
 */
export function transformCpiRecords(records) {
  if (!records || records.length === 0) {
    console.warn('No records to transform')
    return []
  }

  // Log first record structure for debugging
  if (records.length > 0) {
    console.log('Sample record keys:', Object.keys(records[0]))
    console.log('Sample record DataSeries:', records[0]['DataSeries'])
  }

  let transformedCount = 0
  let skippedCount = 0
  let errorCount = 0
  const transformed = []

  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    try {
      const transformedRecord = transformCpiRecord(record)
      if (transformedRecord) {
        transformed.push(transformedRecord)
        transformedCount++
      } else {
        skippedCount++
        // Log first few skipped records for debugging
        if (skippedCount <= 5) {
          const dataSeries = record['DataSeries'] || 'Unknown'
          console.log(`Skipped record ${i + 1}: ${dataSeries}`)
        }
      }
    } catch (error) {
      errorCount++
      console.error(`Error transforming record ${i + 1}:`, error.message)
    }
  }

  console.log(`Transformed ${transformedCount} out of ${records.length} records (${skippedCount} skipped, ${errorCount} errors)`)
  
  if (transformed.length === 0 && records.length > 0) {
    console.error('No records were successfully transformed.')
    console.error('First record DataSeries:', records[0]['DataSeries'])
    console.error('First record keys:', Object.keys(records[0]))
    // Check a few more records to see the pattern
    for (let i = 0; i < Math.min(10, records.length); i++) {
      console.error(`Record ${i + 1} DataSeries:`, records[i]['DataSeries'])
    }
  }

  return transformed
}
