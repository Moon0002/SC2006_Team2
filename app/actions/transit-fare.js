'use server'

import { geocodePostalCode } from '@/lib/geocoding/google'
import { findNearestTransitNode } from '@/lib/lta/transit-nodes'
import { calculateTransitFare } from '@/lib/lta/fare-calculator'
import { getMemoryCachedFare, setMemoryCachedFare } from '@/lib/lta/fare-cache'

// Default fallback fare if calculation fails
const DEFAULT_FARE = 2.00

/**
 * Calculates transit fare between two Singapore postal codes
 * @param {string} originPostalCode - 6-digit origin postal code
 * @param {string} destinationPostalCode - 6-digit destination postal code
 * @returns {Promise<Object>} Fare calculation result
 */
export async function calculateFareBetweenPostalCodes(originPostalCode, destinationPostalCode) {
  try {
    // Validate postal codes
    if (!/^\d{6}$/.test(originPostalCode)) {
      throw new Error(`Invalid origin postal code: ${originPostalCode}. Must be 6 digits.`)
    }

    if (!/^\d{6}$/.test(destinationPostalCode)) {
      throw new Error(`Invalid destination postal code: ${destinationPostalCode}. Must be 6 digits.`)
    }

    // Check cache first
    const cached = getMemoryCachedFare(originPostalCode, destinationPostalCode)
    if (cached) {
      return {
        ...cached,
        cached: true,
      }
    }

    // Step 1: Geocode both postal codes
    let originCoords, destCoords

    try {
      const [originGeocode, destGeocode] = await Promise.all([
        geocodePostalCode(originPostalCode),
        geocodePostalCode(destinationPostalCode),
      ])

      originCoords = { lat: originGeocode.lat, lng: originGeocode.lng }
      destCoords = { lat: destGeocode.lat, lng: destGeocode.lng }
    } catch (error) {
      console.error('Geocoding error:', error)
      return {
        success: false,
        error: `Failed to geocode postal codes: ${error.message}`,
        fare: DEFAULT_FARE,
        method: 'fallback',
      }
    }

    // Step 2: Find nearest transit nodes (optional - can skip if we use direct distance)
    // For now, we'll use direct distance calculation which is faster and more reliable
    // You can enhance this later to use actual transit nodes for more accuracy

    // Step 3: Calculate fare using distance-based calculation
    try {
      const result = await calculateTransitFare(
        originCoords,
        destCoords,
        { useDirectDistance: false } // Use route estimation
      )

      const fareResult = {
        success: true,
        fare: result.fare,
        distanceKm: result.distanceKm,
        method: result.method,
        originPostalCode,
        destinationPostalCode,
        originCoords,
        destinationCoords: destCoords, // Use destCoords instead of destinationCoords
      }

      // Cache the result (24 hour TTL)
      setMemoryCachedFare(originPostalCode, destinationPostalCode, fareResult, 86400)

      return fareResult
    } catch (error) {
      console.error('Fare calculation error:', error)
      // Fallback to default fare
      return {
        success: false,
        error: `Fare calculation failed: ${error.message}`,
        fare: DEFAULT_FARE,
        method: 'fallback',
        originPostalCode,
        destinationPostalCode,
      }
    }
  } catch (error) {
    console.error('Unexpected error in fare calculation:', error)
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      fare: DEFAULT_FARE,
      method: 'fallback',
      originPostalCode,
      destinationPostalCode,
    }
  }
}

/**
 * Calculates transit fare with transit node lookup (more accurate but slower)
 * @param {string} originPostalCode - 6-digit origin postal code
 * @param {string} destinationPostalCode - 6-digit destination postal code
 * @returns {Promise<Object>} Fare calculation result with transit node details
 */
export async function calculateFareWithTransitNodes(originPostalCode, destinationPostalCode) {
  try {
    // Validate postal codes
    if (!/^\d{6}$/.test(originPostalCode) || !/^\d{6}$/.test(destinationPostalCode)) {
      throw new Error('Postal codes must be 6-digit numbers')
    }

    // Step 1: Geocode postal codes
    const [originGeocode, destGeocode] = await Promise.all([
      geocodePostalCode(originPostalCode),
      geocodePostalCode(destinationPostalCode),
    ])

    // Step 2: Find nearest transit nodes
    const [originTransit, destTransit] = await Promise.all([
      findNearestTransitNode(originGeocode.lat, originGeocode.lng),
      findNearestTransitNode(destGeocode.lat, destGeocode.lng),
    ])

    // Step 3: Calculate distance and fare
    if (!originTransit.nearest || !destTransit.nearest) {
      // Fallback to direct distance if transit nodes not found
      const result = await calculateTransitFare(
        { lat: originGeocode.lat, lng: originGeocode.lng },
        { lat: destGeocode.lat, lng: destGeocode.lng },
        { useDirectDistance: false }
      )

      return {
        success: true,
        fare: result.fare,
        distanceKm: result.distanceKm,
        method: 'direct_fallback',
        originPostalCode,
        destinationPostalCode,
        warning: 'Transit nodes not found, using direct distance',
      }
    }

    // Calculate distance between transit nodes
    const result = await calculateTransitFare(
      {
        lat: parseFloat(originTransit.nearest.Latitude || originGeocode.lat),
        lng: parseFloat(originTransit.nearest.Longitude || originGeocode.lng),
      },
      {
        lat: parseFloat(destTransit.nearest.Latitude || destGeocode.lat),
        lng: parseFloat(destTransit.nearest.Longitude || destGeocode.lng),
      },
      { useDirectDistance: false }
    )

    return {
      success: true,
      fare: result.fare,
      distanceKm: result.distanceKm,
      method: 'transit_nodes',
      originPostalCode,
      destinationPostalCode,
      originTransit: {
        busStop: originTransit.busStop ? {
          code: originTransit.busStop.BusStopCode,
          name: originTransit.busStop.Description,
          distance: originTransit.busStop.distance,
        } : null,
        mrtStation: originTransit.mrtStation,
      },
      destinationTransit: {
        busStop: destTransit.busStop ? {
          code: destTransit.busStop.BusStopCode,
          name: destTransit.busStop.Description,
          distance: destTransit.busStop.distance,
        } : null,
        mrtStation: destTransit.mrtStation,
      },
    }
  } catch (error) {
    console.error('Error calculating fare with transit nodes:', error)
    return {
      success: false,
      error: error.message || 'Unknown error',
      fare: DEFAULT_FARE,
      method: 'fallback',
      originPostalCode,
      destinationPostalCode,
    }
  }
}
