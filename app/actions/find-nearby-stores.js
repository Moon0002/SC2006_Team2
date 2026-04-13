'use server'

import { geocodePostalCode } from '@/lib/geocoding/google'
import { calculateTripROI } from './roi-calculator'
import {
  isValidPostalCode,
  isValidHourlyRate,
  validateBasketItemsForROI,
} from '@/lib/validation'

/**
 * Reverse geocode coordinates to get postal code
 */
async function reverseGeocodePostalCode(lat, lng) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  
  if (!apiKey) {
    return null
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&region=sg`
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Find postal code in address components
      for (const result of data.results) {
        if (result.address_components) {
          const postalComponent = result.address_components.find(
            comp => comp.types.includes('postal_code')
          )
          if (postalComponent) {
            return postalComponent.long_name
          }
        }
      }
    }
    return null
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

/**
 * Find nearby supermarkets using Google Places API
 * Returns stores filtered to supported chains and grouped by chain.
 */
async function findNearbySupermarkets(originLat, originLng) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  
  if (!apiKey) {
    throw new Error('Google Maps API key not configured')
  }

  const supportedChains = [
    {
      chain: 'Cold Storage',
      keyword: 'Cold Storage',
      matches: [/cold\s*storage/i],
    },
    {
      chain: 'FairPrice',
      keyword: 'FairPrice',
      matches: [/fair\s*price/i, /ntuc\s*fair\s*price/i, /\bfairprice\b/i],
    },
    {
      chain: 'Sheng Siong',
      keyword: 'Sheng Siong',
      matches: [/sheng\s*siong/i],
    },
  ]

  function getChainForPlaceName(name) {
    const n = String(name || '').trim()
    if (!n) return null
    for (const c of supportedChains) {
      if (c.matches.some((re) => re.test(n))) return c.chain
    }
    return null
  }

  async function placesNearestForKeyword(keyword) {
    // Use Places API (Nearby Search) ranked by distance for each chain keyword.
    // rankby=distance cannot be used with radius.
    const url =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${originLat},${originLng}` +
      `&rankby=distance` +
      `&type=supermarket` +
      `&keyword=${encodeURIComponent(keyword)}` +
      `&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Places API error:', data.status, data.error_message)
      return null
    }
    return data.results || []
  }
  
  try {
    // Query Places per chain keyword so each chain has a chance to appear.
    const perChainResults = await Promise.all(
      supportedChains.map(async (c) => {
        const results = await placesNearestForKeyword(c.keyword)
        return { chain: c.chain, results }
      })
    )

    // If any chain call failed (null), treat as Places failure and let caller fallback.
    if (perChainResults.some((r) => r.results === null)) {
      return null
    }

    // Build candidates from all results, then pick closest 2 per chain.
    const seenPlaceIds = new Set()
    const candidates = []
    for (const { chain, results } of perChainResults) {
      for (const place of results || []) {
        if (!place?.place_id || seenPlaceIds.has(place.place_id)) continue
        // Verify chain match via name (defensive)
        const derivedChain = getChainForPlaceName(place.name)
        if (derivedChain !== chain) continue
        const lat = place?.geometry?.location?.lat
        const lng = place?.geometry?.location?.lng
        if (typeof lat !== 'number' || typeof lng !== 'number') continue
        seenPlaceIds.add(place.place_id)
        candidates.push({
          place,
          chain,
          distanceKm: calculateDistance(originLat, originLng, lat, lng),
        })
      }
    }

    if (candidates.length > 0) {
      const picked = []
      for (const chainDef of supportedChains) {
        const nearest = candidates
          .filter((c) => c.chain === chainDef.chain)
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, 2)
        picked.push(...nearest)
      }
      
      // Extract postal codes - Places Nearby Search doesn't include address_components
      // We'll need to reverse geocode or use Place Details API
      // For now, try to extract from formatted_address, otherwise reverse geocode
      const storesWithPostalCodes = await Promise.all(
        picked.map(async ({ place, chain, distanceKm }) => {
          let postalCode = null
          
          // Try to extract from formatted_address (format: "Address, Singapore 123456")
          if (place.formatted_address) {
            const postalMatch = place.formatted_address.match(/\b(\d{6})\b/)
            if (postalMatch) {
              postalCode = postalMatch[1]
            }
          }
          
          // If not found, try reverse geocoding
          if (!postalCode) {
            postalCode = await reverseGeocodePostalCode(
              place.geometry.location.lat,
              place.geometry.location.lng
            )
          }
          
          return {
            placeId: place.place_id,
            name: place.name,
            chain,
            address: place.vicinity || place.formatted_address,
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            rating: place.rating,
            reviewCount: place.user_ratings_total || 0,
            postalCode: postalCode,
            distance: distanceKm,
          }
        })
      )
      
      return storesWithPostalCodes
    }
    
    return []
  } catch (error) {
    console.error('Error fetching nearby supermarkets:', error)
    return null // Fallback to static dataset
  }
}

/**
 * Fallback: Use static SUPERMARKETS dataset and find closest by distance
 * Filter to supported chains and return closest 2 per chain.
 */
function findClosestFromStatic(originLat, originLng) {
  // Dynamic import to avoid SSR issues
  return import('@/lib/data/supermarkets').then(({ SUPERMARKETS }) => {
    const supportedChains = new Set(['Cold Storage', 'FairPrice', 'Sheng Siong'])

    // Calculate distance for each store
    const storesWithDistance = SUPERMARKETS.map(store => {
      const distance = calculateDistance(originLat, originLng, store.lat, store.lng)
      return {
        ...store,
        distance,
        reviewCount: store.reviewCount || 0,
      }
    })
    
    const filtered = storesWithDistance.filter((s) => supportedChains.has(s.chain))

    const byChain = (chain) =>
      filtered
        .filter((s) => s.chain === chain)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 2)

    // 2 nearest per chain (up to 6)
    return [
      ...byChain('Cold Storage'),
      ...byChain('FairPrice'),
      ...byChain('Sheng Siong'),
    ]
  })
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Find nearby stores from supported chains and return closest 2 per chain (up to 6).
 * @param {string} originPostalCode - Origin postal code
 * @returns {Promise<Array>} Array of stores
 */
export async function findTopStoresByReviews(originPostalCode) {
  if (!originPostalCode) {
    return {
      success: false,
      error: 'Origin postal code is required',
      stores: [],
    }
  }

  const originDigits = String(originPostalCode).replace(/\D/g, '')
  if (!isValidPostalCode(originDigits)) {
    return {
      success: false,
      error: 'Please enter a valid 6-digit postal code.',
      stores: [],
    }
  }

  try {
    // Step 1: Geocode origin postal code
    const originCoords = await geocodePostalCode(originDigits)
    if (!originCoords || !originCoords.lat || !originCoords.lng) {
      return {
        success: false,
        error: 'Could not find location for origin postal code',
        stores: [],
      }
    }

    // Step 2: Try to find nearby stores using Places API
    let stores = await findNearbySupermarkets(originCoords.lat, originCoords.lng)
    
    // Step 3: Fill missing chains from static dataset (or full fallback if Places failed)
    const staticStores = await findClosestFromStatic(originCoords.lat, originCoords.lng)
    if (!stores) {
      stores = staticStores
    } else {
      const byChain = new Map()
      for (const s of stores) {
        const chain = s.chain
        if (!byChain.has(chain)) byChain.set(chain, [])
        byChain.get(chain).push(s)
      }

      // Ensure at least 2 per chain when possible, using static to fill gaps
      const chains = ['Cold Storage', 'FairPrice', 'Sheng Siong']
      const filled = []
      for (const chain of chains) {
        const fromPlaces = (byChain.get(chain) || []).slice(0, 2)
        const need = 2 - fromPlaces.length
        const fromStatic = staticStores
          .filter((s) => s.chain === chain)
          .slice(0, Math.max(0, need))
        filled.push(...fromPlaces, ...fromStatic)
      }
      stores = filled
    }

    if (!stores || stores.length === 0) {
      return {
        success: false,
        error: 'No supermarkets found nearby',
        stores: [],
      }
    }

    return {
      success: true,
      stores: stores.map(store => ({
        placeId: store.placeId || store.id,
        name: store.name,
        chain: store.chain,
        address: store.address,
        lat: store.lat,
        lng: store.lng,
        postalCode: store.postalCode,
        rating: store.rating,
        reviewCount: store.reviewCount,
        distance: store.distance,
      })),
    }
  } catch (error) {
    console.error('Error finding nearby stores:', error)
    return {
      success: false,
      error: error.message || 'Failed to find nearby stores',
      stores: [],
    }
  }
}

/**
 * Calculate ROI for top 3 stores and return sorted results
 * @param {string} originPostalCode - Origin postal code
 * @param {Array} basketItems - Basket items
 * @param {number} hourlyRate - User's hourly rate
 * @param {string} userId - Optional user ID
 * @returns {Promise<Object>} Top 3 stores with ROI calculations
 */
export async function findTopStoresWithROI({
  originPostalCode,
  basketItems = [],
  hourlyRate = 10,
  userId = null,
}) {
  if (!originPostalCode) {
    return {
      success: false,
      error: 'Origin postal code is required',
      stores: [],
    }
  }

  const originDigits = String(originPostalCode).replace(/\D/g, '')
  if (!isValidPostalCode(originDigits)) {
    return {
      success: false,
      error: 'Please enter a valid 6-digit postal code.',
      stores: [],
    }
  }

  if (!basketItems || basketItems.length === 0) {
    return {
      success: false,
      error: 'Basket is empty',
      stores: [],
    }
  }

  const basketCheck = validateBasketItemsForROI(basketItems)
  if (!basketCheck.ok) {
    return {
      success: false,
      error: basketCheck.error,
      stores: [],
    }
  }

  if (!isValidHourlyRate(Number(hourlyRate))) {
    return {
      success: false,
      error: 'Hourly rate must be a number zero or greater.',
      stores: [],
    }
  }

  try {
    // Step 1: Find top 3 stores by reviews
    const storesResult = await findTopStoresByReviews(originDigits)
    
    if (!storesResult.success || storesResult.stores.length === 0) {
      return storesResult
    }

    // Step 2: Calculate ROI for each store
    const roiResults = []

    const chainsWanted = ['Cold Storage', 'FairPrice', 'Sheng Siong']
    const maxPerChain = 2
    
    for (const store of storesResult.stores) {
      // Need postal code for ROI calculation
      let destinationPostalCode = store.postalCode
      
      if (!destinationPostalCode) {
        // Try to extract postal code from address (format: "Singapore 123456" or "123456 Singapore")
        const postalMatch = store.address?.match(/\b(\d{6})\b/)
        if (postalMatch) {
          destinationPostalCode = postalMatch[1]
        } else {
          // Last resort: try reverse geocoding again (in case it wasn't done earlier)
          try {
            destinationPostalCode = await reverseGeocodePostalCode(store.lat, store.lng)
          } catch (error) {
            console.warn(`Could not get postal code for ${store.name}:`, error)
          }
          
          if (!destinationPostalCode) {
            // Skip stores without postal codes - we need it for fare calculation
            console.warn(`Store ${store.name} has no postal code, skipping ROI calculation`)
            continue
          }
        }
      }

      try {
        const roiResult = await calculateTripROI({
          basketItems: basketCheck.items,
          originPostalCode: originDigits,
          destinationPostalCode,
          martChain: store.chain || null,
          hourlyRate,
          userId,
        })

        if (roiResult.success) {
          roiResults.push({
            store: {
              id: store.placeId || `store-${store.name}`,
              name: store.name,
              address: store.address,
              chain: store.chain,
              postalCode: destinationPostalCode,
              lat: store.lat,
              lng: store.lng,
              rating: store.rating,
              reviewCount: store.reviewCount,
              distance: store.distance,
            },
            roi: {
              netROI: roiResult.netROI,
              totalGrossSavings: roiResult.totalGrossSavings,
              transitFare: roiResult.transitFare,
              transitData: roiResult.transitData,
              opportunityCost: roiResult.opportunityCost,
              isWorthIt: roiResult.isWorthIt,
              travelTimeHours: roiResult.travelTimeHours,
            },
          })
        }
      } catch (error) {
        console.error(`Error calculating ROI for ${store.name}:`, error)
        // Continue with other stores
      }
    }

    // Step 2.5: Guarantee up to 2 stores per chain using static dataset if missing.
    // This addresses cases where Places results are missing postal codes or are unavailable.
    try {
      // Count current per-chain successes
      const perChainCount = new Map(chainsWanted.map((c) => [c, 0]))
      const seenIds = new Set()
      for (const r of roiResults) {
        const chain = r?.store?.chain
        const id = r?.store?.id
        if (id) seenIds.add(id)
        if (perChainCount.has(chain)) {
          perChainCount.set(chain, perChainCount.get(chain) + 1)
        }
      }

      const needsFill = chainsWanted.some((c) => (perChainCount.get(c) || 0) < maxPerChain)
      if (needsFill) {
        const originCoords = await geocodePostalCode(originDigits)
        const staticStores = await findClosestFromStatic(originCoords.lat, originCoords.lng)

        for (const chain of chainsWanted) {
          while ((perChainCount.get(chain) || 0) < maxPerChain) {
            const candidate = staticStores.find((s) => s.chain === chain && !seenIds.has(s.id))
            if (!candidate) break

            seenIds.add(candidate.id)
            perChainCount.set(chain, (perChainCount.get(chain) || 0) + 1)

            const roiResult = await calculateTripROI({
              basketItems: basketCheck.items,
              originPostalCode: originDigits,
              destinationPostalCode: candidate.postalCode,
              martChain: candidate.chain || null,
              hourlyRate,
              userId,
            })

            if (roiResult.success) {
              roiResults.push({
                store: {
                  id: candidate.id,
                  name: candidate.name,
                  address: candidate.address,
                  chain: candidate.chain,
                  postalCode: candidate.postalCode,
                  lat: candidate.lat,
                  lng: candidate.lng,
                  rating: candidate.rating,
                  reviewCount: candidate.reviewCount,
                  distance: candidate.distance,
                },
                roi: {
                  netROI: roiResult.netROI,
                  totalGrossSavings: roiResult.totalGrossSavings,
                  transitFare: roiResult.transitFare,
                  transitData: roiResult.transitData,
                  opportunityCost: roiResult.opportunityCost,
                  isWorthIt: roiResult.isWorthIt,
                  travelTimeHours: roiResult.travelTimeHours,
                },
              })
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not fill missing chain stores from static dataset:', e?.message || e)
    }

    // Sort by net ROI (descending) - best deals first
    roiResults.sort((a, b) => b.roi.netROI - a.roi.netROI)

    return {
      success: true,
      stores: roiResults,
    }
  } catch (error) {
    console.error('Error finding top stores with ROI:', error)
    return {
      success: false,
      error: error.message || 'Failed to find and calculate ROI for stores',
      stores: [],
    }
  }
}
