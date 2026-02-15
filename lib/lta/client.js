/**
 * LTA DataMall API Client
 * Handles authentication and requests to LTA DataMall 2.0 API
 */

const LTA_BASE_URL = 'https://datamall2.mytransport.sg/ltaodataservice'

/**
 * Gets the LTA API key from environment variables
 * @returns {string} API key
 * @throws {Error} If API key is not configured
 */
function getApiKey() {
  const apiKey = process.env.LTA_DATAMALL_API_KEY?.trim()
  
  if (!apiKey) {
    throw new Error('LTA_DATAMALL_API_KEY is not configured in environment variables')
  }
  
  return apiKey
}

/**
 * Makes an authenticated request to LTA DataMall API
 * @param {string} endpoint - API endpoint (e.g., 'BusStops', 'BusArrivalv2')
 * @param {Object} options - Fetch options
 * @param {Object} options.queryParams - Query parameters as object
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * @returns {Promise<Object>} API response data
 */
export async function fetchLtaData(endpoint, {
  queryParams = {},
  maxRetries = 3,
  retryDelay = 1000,
} = {}) {
  const apiKey = getApiKey()
  
  // Build URL with query parameters
  const url = new URL(`${LTA_BASE_URL}/${endpoint}`)
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value.toString())
    }
  })

  let lastError = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout manually for better compatibility
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'AccountKey': apiKey,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay * attempt * 5
          throw new Error(
            `Rate limited (429). Wait ${waitTime / 1000}s before retry. ${response.statusText}`
          )
        }
        
        // Handle unauthorized (401)
        if (response.status === 401) {
          throw new Error(
            `Unauthorized (401): Invalid API key or missing AccountKey header`
          )
        }

        throw new Error(
          `LTA API returned ${response.status}: ${response.statusText}`
        )
      }

      const data = await response.json()
      return {
        success: true,
        data,
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
    `Failed to fetch LTA data after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
  )
}

/**
 * Fetches bus stops from LTA DataMall
 * @param {Object} options - Fetch options
 * @param {number} options.skip - Number of records to skip (pagination)
 * @returns {Promise<Object>} Bus stops data
 */
export async function fetchBusStops({ skip = 0 } = {}) {
  return fetchLtaData('BusStops', {
    queryParams: { $skip: skip },
  })
}

/**
 * Fetches bus arrival information
 * @param {string} busStopCode - 5-digit bus stop code
 * @returns {Promise<Object>} Bus arrival data
 */
export async function fetchBusArrival(busStopCode) {
  if (!busStopCode || busStopCode.length !== 5) {
    throw new Error('Bus stop code must be a 5-digit string')
  }

  return fetchLtaData('BusArrivalv2', {
    queryParams: { BusStopCode: busStopCode },
  })
}

/**
 * Fetches MRT stations from LTA DataMall
 * @param {Object} options - Fetch options
 * @param {number} options.skip - Number of records to skip (pagination)
 * @returns {Promise<Object>} MRT stations data
 */
export async function fetchMrtStations({ skip = 0 } = {}) {
  return fetchLtaData('TrainServiceAlerts', {
    queryParams: { $skip: skip },
  })
}

/**
 * Fetches all bus stops by paginating through the API
 * @param {Object} options - Fetch options
 * @param {number} options.batchSize - Records per page (default: 500, LTA max)
 * @param {number} options.delayBetweenBatches - Delay between batches in ms (default: 1000)
 * @returns {Promise<Array>} Array of all bus stops
 */
export async function fetchAllBusStops({ batchSize = 500, delayBetweenBatches = 1000 } = {}) {
  const allStops = []
  let skip = 0
  let hasMore = true

  while (hasMore) {
    try {
      const result = await fetchBusStops({ skip })
      
      if (result.success && result.data?.value) {
        const stops = result.data.value
        allStops.push(...stops)
        
        console.log(`Fetched ${stops.length} bus stops (total: ${allStops.length})`)

        // Check if there are more records
        hasMore = stops.length === batchSize

        if (hasMore) {
          skip += batchSize
          console.log(`Waiting ${delayBetweenBatches}ms before next batch...`)
          await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches))
        }

        // Safety limit to prevent infinite loops
        if (skip > 100000) {
          console.warn('Reached safety limit of 100,000 records. Stopping pagination.')
          break
        }
      } else {
        hasMore = false
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

  return allStops
}
