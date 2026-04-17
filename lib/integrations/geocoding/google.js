/**
 * Google Maps Geocoding Utility
 * Converts Singapore postal codes to coordinates
 * 
 * For server-side calls, use GOOGLE_MAPS_API_KEY (without referrer restrictions)
 * For client-side calls, use NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (with referrer restrictions)
 */

import { isValidPostalCode } from '@/lib/utils/validation'

const GOOGLE_GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json'

/**
 * Gets the appropriate API key for geocoding
 * Prefers server-side key if available, falls back to public key
 */
function getGeocodingApiKey() {
  // For server-side: use GOOGLE_MAPS_API_KEY (no referrer restrictions)
  // For client-side: use NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (with referrer restrictions)
  const serverKey = process.env.GOOGLE_MAPS_API_KEY
  const publicKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Prefer server key for server-side calls (no referrer restrictions)
  if (serverKey) {
    return serverKey.trim()
  }

  // Fallback to public key (may have referrer restrictions - will fail on server-side)
  if (publicKey) {
    // Only warn once per process to avoid spam
    if (typeof window === 'undefined' && !global._geocodingKeyWarned) {
      console.warn(
        '  Using NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for server-side geocoding. ' +
        'This may fail if the key has HTTP referrer restrictions. ' +
        'Set GOOGLE_MAPS_API_KEY (without referrer restrictions) in .env for server-side calls.'
      )
      global._geocodingKeyWarned = true
    }
    return publicKey.trim()
  }

  throw new Error(
    'Google Maps API key not configured. ' +
    'Set GOOGLE_MAPS_API_KEY (for server-side) or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (for client-side) in .env'
  )
}

/**
 * Geocodes a Singapore postal code to coordinates
 * @param {string} postalCode - 6-digit Singapore postal code
 * @returns {Promise<Object>} { lat, lng, formattedAddress }
 */
export async function geocodePostalCode(postalCode) {
  const apiKey = getGeocodingApiKey()

  if (!isValidPostalCode(String(postalCode).trim())) {
    throw new Error('Postal code must be a 6-digit number')
  }

  // Format: Singapore postal code
  const address = `Singapore ${postalCode}`

  const url = new URL(GOOGLE_GEOCODING_URL)
  url.searchParams.set('address', address)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('region', 'sg') // Restrict to Singapore

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Geocoding API returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.status === 'ZERO_RESULTS') {
      throw new Error(`No results found for postal code: ${postalCode}`)
    }

    if (data.status !== 'OK') {
      throw new Error(`Geocoding API error: ${data.status} - ${data.error_message || 'Unknown error'}`)
    }

    if (!data.results || data.results.length === 0) {
      throw new Error(`No results returned for postal code: ${postalCode}`)
    }

    const result = data.results[0]
    const location = result.geometry.location

    return {
      success: true,
      lat: location.lat,
      lng: location.lng,
      formattedAddress: result.formatted_address,
      postalCode,
    }
  } catch (error) {
    throw new Error(`Geocoding failed: ${error.message}`)
  }
}

/**
 * Calculates distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  
  return distance
}
