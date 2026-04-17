/**
 * LTA Transit Fare Calculator
 * Calculates adult card fares based on distance using LTA's standard fare tables
 */

import { calculateDistance, geocodePostalCode } from '@/lib/integrations/geocoding/google'

/**
 * LTA Distance-Based Fare Tiers (Adult Card Fares)
 * Based on Singapore's public transport fare structure
 * These are approximate values - actual fares may vary slightly
 */
const FARE_TIERS = [
  { maxDistance: 3.2, fare: 0.92 },      // Up to 3.2 km
  { maxDistance: 4.2, fare: 0.99 },       // 3.2 - 4.2 km
  { maxDistance: 5.2, fare: 1.09 },      // 4.2 - 5.2 km
  { maxDistance: 6.2, fare: 1.18 },     // 5.2 - 6.2 km
  { maxDistance: 7.2, fare: 1.26 },      // 6.2 - 7.2 km
  { maxDistance: 8.2, fare: 1.34 },      // 7.2 - 8.2 km
  { maxDistance: 9.2, fare: 1.41 },      // 8.2 - 9.2 km
  { maxDistance: 10.2, fare: 1.48 },     // 9.2 - 10.2 km
  { maxDistance: 11.2, fare: 1.55 },     // 10.2 - 11.2 km
  { maxDistance: 12.2, fare: 1.61 },     // 11.2 - 12.2 km
  { maxDistance: 13.2, fare: 1.67 },     // 12.2 - 13.2 km
  { maxDistance: 14.2, fare: 1.72 },     // 13.2 - 14.2 km
  { maxDistance: 15.2, fare: 1.77 },     // 14.2 - 15.2 km
  { maxDistance: 16.2, fare: 1.82 },     // 15.2 - 16.2 km
  { maxDistance: 17.2, fare: 1.86 },     // 16.2 - 17.2 km
  { maxDistance: 18.2, fare: 1.90 },     // 17.2 - 18.2 km
  { maxDistance: 19.2, fare: 1.94 },     // 18.2 - 19.2 km
  { maxDistance: 20.2, fare: 1.98 },     // 19.2 - 20.2 km
  { maxDistance: 22.2, fare: 2.05 },     // 20.2 - 22.2 km
  { maxDistance: 24.2, fare: 2.11 },     // 22.2 - 24.2 km
  { maxDistance: 26.2, fare: 2.17 },     // 24.2 - 26.2 km
  { maxDistance: 28.2, fare: 2.22 },     // 26.2 - 28.2 km
  { maxDistance: 30.2, fare: 2.27 },     // 28.2 - 30.2 km
  { maxDistance: Infinity, fare: 2.32 },  // Above 30.2 km (maximum fare)
]

/**
 * Calculates adult card fare based on distance in kilometers
 * @param {number} distanceKm - Distance in kilometers
 * @returns {number} Fare in SGD (rounded to 2 decimal places)
 */
export function calculateFareByDistance(distanceKm) {
  if (distanceKm < 0) {
    throw new Error('Distance cannot be negative')
  }

  // Find the appropriate fare tier
  for (const tier of FARE_TIERS) {
    if (distanceKm <= tier.maxDistance) {
      return Math.round(tier.fare * 100) / 100 // Round to 2 decimal places
    }
  }

  // Should never reach here, but return max fare as fallback
  return 2.32
}

/**
 * Estimates route distance between two transit nodes
 * Uses straight-line distance as approximation (actual route may be longer)
 * @param {Object} origin - Origin transit node { lat, lng }
 * @param {Object} destination - Destination transit node { lat, lng }
 * @returns {number} Estimated distance in kilometers
 */
export function estimateRouteDistance(origin, destination) {
  
  if (!origin || !destination || !origin.lat || !origin.lng || !destination.lat || !destination.lng) {
    throw new Error('Origin and destination must have valid lat/lng coordinates')
  }

  // Calculate straight-line distance in meters
  const distanceMeters = calculateDistance(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng
  )

  // Convert to kilometers
  const distanceKm = distanceMeters / 1000

  // Apply a route factor (actual transit routes are typically 1.2-1.5x longer than straight-line)
  // This is a rough approximation - actual routes depend on road/rail network
  const routeFactor = 1.3
  const estimatedRouteDistance = distanceKm * routeFactor

  return Math.round(estimatedRouteDistance * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculates transit fare between two locations
 * @param {Object} origin - Origin location { lat, lng } or { postalCode }
 * @param {Object} destination - Destination location { lat, lng } or { postalCode }
 * @param {Object} options - Options
 * @param {boolean} options.useDirectDistance - Use direct distance instead of route estimation (default: false)
 * @returns {Promise<Object>} { fare, distanceKm, method }
 */
export async function calculateTransitFare(origin, destination, options = {}) {
  const { useDirectDistance = false } = options

  try {
    // If postal codes provided, geocode them first
    let originCoords = origin
    let destCoords = destination

    if (origin.postalCode) {
      const geocoded = await geocodePostalCode(origin.postalCode)
      originCoords = { lat: geocoded.lat, lng: geocoded.lng }
    }

    if (destination.postalCode) {
      const geocoded = await geocodePostalCode(destination.postalCode)
      destCoords = { lat: geocoded.lat, lng: geocoded.lng }
    }

    // Calculate distance
    let distanceKm
    if (useDirectDistance) {
      distanceKm = calculateDistance(
        originCoords.lat,
        originCoords.lng,
        destCoords.lat,
        destCoords.lng
      ) / 1000
    } else {
      distanceKm = estimateRouteDistance(originCoords, destCoords)
    }

    // Calculate fare
    const fare = calculateFareByDistance(distanceKm)

    return {
      success: true,
      fare,
      distanceKm: Math.round(distanceKm * 100) / 100,
      method: useDirectDistance ? 'direct' : 'estimated_route',
    }
  } catch (error) {
    throw new Error(`Fare calculation failed: ${error.message}`)
  }
}
