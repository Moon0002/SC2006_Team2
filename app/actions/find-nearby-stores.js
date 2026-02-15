'use server'

import { geocodePostalCode } from '@/lib/geocoding/google'
import { calculateTripROI } from './roi-calculator'

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
 * Returns stores sorted by review count (highest first)
 */
async function findNearbySupermarkets(originLat, originLng) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  
  if (!apiKey) {
    throw new Error('Google Maps API key not configured')
  }

  // Use Places API (Nearby Search) to find supermarkets
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${originLat},${originLng}&radius=5000&type=supermarket&key=${apiKey}`
  
  try {
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Places API error:', data.status, data.error_message)
      // Fallback to our static dataset if Places API fails
      return null
    }
    
    if (data.results && data.results.length > 0) {
      // Sort by review count (user_ratings_total) descending
      const sorted = data.results
        .filter(place => place.user_ratings_total > 0) // Only places with reviews
        .sort((a, b) => (b.user_ratings_total || 0) - (a.user_ratings_total || 0))
        .slice(0, 3) // Top 3
      
      // Extract postal codes - Places Nearby Search doesn't include address_components
      // We'll need to reverse geocode or use Place Details API
      // For now, try to extract from formatted_address, otherwise reverse geocode
      const storesWithPostalCodes = await Promise.all(
        sorted.map(async (place) => {
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
            address: place.vicinity || place.formatted_address,
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng,
            rating: place.rating,
            reviewCount: place.user_ratings_total || 0,
            postalCode: postalCode,
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
 * Then sort by a mock review count (we'll use a simple heuristic)
 */
function findClosestFromStatic(originLat, originLng) {
  // Dynamic import to avoid SSR issues
  return import('@/lib/data/supermarkets').then(({ SUPERMARKETS }) => {
    // Calculate distance for each store
    const storesWithDistance = SUPERMARKETS.map(store => {
      const distance = calculateDistance(originLat, originLng, store.lat, store.lng)
      return {
        ...store,
        distance,
        // Mock review count based on store type and chain
        // Hypermarkets get more reviews, popular chains get more
        reviewCount: store.category === 'hypermarket' ? 500 + Math.floor(Math.random() * 200) :
                     store.chain === 'FairPrice' ? 300 + Math.floor(Math.random() * 150) :
                     store.chain === 'Sheng Siong' ? 400 + Math.floor(Math.random() * 150) :
                     200 + Math.floor(Math.random() * 100),
      }
    })
    
    // Sort by review count (descending), then take top 3
    return storesWithDistance
      .sort((a, b) => b.reviewCount - a.reviewCount)
      .slice(0, 3)
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
 * Find top 3 nearby stores ranked by review count
 * @param {string} originPostalCode - Origin postal code
 * @returns {Promise<Array>} Array of top 3 stores with ROI data
 */
export async function findTopStoresByReviews(originPostalCode) {
  if (!originPostalCode) {
    return {
      success: false,
      error: 'Origin postal code is required',
      stores: [],
    }
  }

  try {
    // Step 1: Geocode origin postal code
    const originCoords = await geocodePostalCode(originPostalCode)
    if (!originCoords || !originCoords.lat || !originCoords.lng) {
      return {
        success: false,
        error: 'Could not find location for origin postal code',
        stores: [],
      }
    }

    // Step 2: Try to find nearby stores using Places API
    let stores = await findNearbySupermarkets(originCoords.lat, originCoords.lng)
    
    // Step 3: Fallback to static dataset if Places API fails
    if (!stores) {
      stores = await findClosestFromStatic(originCoords.lat, originCoords.lng)
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

  if (!basketItems || basketItems.length === 0) {
    return {
      success: false,
      error: 'Basket is empty',
      stores: [],
    }
  }

  try {
    // Step 1: Find top 3 stores by reviews
    const storesResult = await findTopStoresByReviews(originPostalCode)
    
    if (!storesResult.success || storesResult.stores.length === 0) {
      return storesResult
    }

    // Step 2: Calculate ROI for each store
    const roiResults = []
    
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
          basketItems,
          originPostalCode,
          destinationPostalCode,
          hourlyRate,
          userId,
        })

        if (roiResult.success) {
          roiResults.push({
            store: {
              id: store.placeId || `store-${store.name}`,
              name: store.name,
              address: store.address,
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
