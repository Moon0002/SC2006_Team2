'use server'

import { geocodePostalCode } from '@/lib/geocoding/google'
import { POSTAL_CODE_REGEX } from '@/lib/validation'
import { calculateTransitFare } from '@/lib/lta/fare-calculator'
import { getMemoryCachedFare, setMemoryCachedFare } from '@/lib/lta/fare-cache'

/** Default fallback fare (round trip SGD) when geocoding or fare calculation fails */
const DEFAULT_FARE = 2.0

/**
 * Calculates transit fare between two Singapore postal codes
 * @param {string} originPostalCode - 6-digit origin postal code
 * @param {string} destinationPostalCode - 6-digit destination postal code
 * @returns {Promise<Object>} Fare calculation result
 */
export async function calculateFareBetweenPostalCodes(originPostalCode, destinationPostalCode) {
  try {
    const origin = String(originPostalCode ?? '').replace(/\D/g, '')
    const dest = String(destinationPostalCode ?? '').replace(/\D/g, '')
    if (!POSTAL_CODE_REGEX.test(origin)) {
      throw new Error(`Invalid origin postal code: ${originPostalCode}. Must be 6 digits.`)
    }

    if (!POSTAL_CODE_REGEX.test(dest)) {
      throw new Error(`Invalid destination postal code: ${destinationPostalCode}. Must be 6 digits.`)
    }

    // Check cache first
    const cached = getMemoryCachedFare(origin, dest)
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
        geocodePostalCode(origin),
        geocodePostalCode(dest),
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
        originPostalCode: origin,
        destinationPostalCode: dest,
        originCoords,
        destinationCoords: destCoords, // Use destCoords instead of destinationCoords
      }

      // Cache the result (24 hour TTL)
      setMemoryCachedFare(origin, dest, fareResult, 86400)

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

