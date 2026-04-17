/**
 * Data.gov.sg API Client
 * Fetches CPI data from the Singapore government's open data portal
 */

const DATA_GOV_SG_BASE_URL = 'https://data.gov.sg/api/action/datastore_search'
const CPI_DATASET_ID = 'd_bdaff844e3ef89d39fceb962ff8f0791'

/**
 * Fetches CPI data from Data.gov.sg API
 * @param {Object} options - Fetch options
 * @param {number} options.limit - Maximum number of records to fetch (default: 100)
 * @param {number} options.offset - Offset for pagination (default: 0)
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * @returns {Promise<Object>} API response with result.records array
 */
export async function fetchCpiData({
  limit = 100,
  offset = 0,
  maxRetries = 3,
  retryDelay = 1000,
} = {}) {
  // Build URL with query parameters
  const url = `${DATA_GOV_SG_BASE_URL}?resource_id=${CPI_DATASET_ID}&limit=${limit}&offset=${offset}`

  let lastError = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout manually for better compatibility
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay * attempt * 2
          throw new Error(
            `Rate limited (429). Wait ${waitTime / 1000}s before retry. ${response.statusText}`
          )
        }
        throw new Error(
          `Data.gov.sg API returned ${response.status}: ${response.statusText}`
        )
      }

      const data = await response.json()

      // Validate response structure
      if (!data.result || !Array.isArray(data.result.records)) {
        throw new Error('Invalid API response structure: missing result.records')
      }

      return {
        success: true,
        data: data.result,
        records: data.result.records,
        total: data.result.total || data.result.records.length,
      }
    } catch (error) {
      lastError = error

      // Don't retry on certain errors
      if (error.name === 'AbortError' || error.name === 'TypeError') {
        throw error
      }

      // Handle rate limiting with longer wait times
      const isRateLimit = lastError?.message?.includes('429') || lastError?.message?.includes('Rate limited')
      const waitTime = isRateLimit 
        ? retryDelay * attempt * 5 // Longer wait for rate limits (5s, 10s, 15s)
        : retryDelay * attempt // Normal exponential backoff

      // If not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        console.log(`Attempt ${attempt} failed. Waiting ${waitTime / 1000}s before retry...`)
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    }
  }

  // If all retries failed, throw the last error
  throw new Error(
    `Failed to fetch CPI data after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
  )
}

/**
 * Fetches all CPI records by paginating through the API
 * @param {Object} options - Fetch options
 * @param {number} options.batchSize - Records per page (default: 100, max: 100)
 * @returns {Promise<Array>} Array of all CPI records
 */
export async function fetchAllCpiData({ batchSize = 100, delayBetweenBatches = 1000 } = {}) {
  const allRecords = []
  let offset = 0
  let hasMore = true

  while (hasMore) {
    try {
      const result = await fetchCpiData({
        limit: Math.min(batchSize, 100), // API max is typically 100
        offset,
      })

      allRecords.push(...result.records)
      console.log(`Fetched ${result.records.length} records (total: ${allRecords.length})`)

      // Check if there are more records
      hasMore = result.records.length === batchSize && 
                (result.total === undefined || offset + batchSize < result.total)
      
      offset += batchSize

      // Add delay between batches to avoid rate limiting
      if (hasMore) {
        console.log(`Waiting ${delayBetweenBatches}ms before next batch...`)
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches))
      }

      // Safety limit to prevent infinite loops
      if (offset > 10000) {
        console.warn('Reached safety limit of 10,000 records. Stopping pagination.')
        break
      }
    } catch (error) {
      // If rate limited, wait longer before continuing
      if (error.message?.includes('429') || error.message?.includes('Rate limited')) {
        console.warn('Rate limited. Waiting 10 seconds before continuing...')
        await new Promise((resolve) => setTimeout(resolve, 10000))
        // Retry the same batch
        continue
      }
      throw error
    }
  }

  return allRecords
}
