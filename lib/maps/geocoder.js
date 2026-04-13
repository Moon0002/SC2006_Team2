/**
 * Google Maps Geocoding Utility using JavaScript SDK
 * Converts Singapore postal codes to coordinates using the JS SDK
 * Falls back to REST API if JS SDK fails
 */

import { loadMapsAPI } from './loader'
import { geocodePostalCode as geocodePostalCodeREST } from '@/lib/geocoding/google'
import { isValidPostalCode } from '@/lib/validation'

/**
 * Geocodes a Singapore postal code to coordinates using Google Maps JS SDK
 * Falls back to REST API if JS SDK is not available or fails
 * @param {string} postalCode - 6-digit Singapore postal code
 * @param {boolean} useRestFallback - Whether to use REST API as fallback (default: true)
 * @returns {Promise<Object>} { lat, lng, formattedAddress }
 */
export async function geocodePostalCodeJS(postalCode, useRestFallback = true) {
  if (!isValidPostalCode(String(postalCode).trim())) {
    throw new Error('Postal code must be a 6-digit number')
  }

  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    // Server-side: use REST API directly
    if (useRestFallback) {
      return await geocodePostalCodeREST(postalCode)
    }
    throw new Error('Geocoding JS SDK requires browser environment')
  }

  // Try JS SDK first, but fallback to REST API if it fails
  // Since REST API works reliably, we'll use it as primary for now
  if (useRestFallback) {
    try {
      // Try REST API first (more reliable)
      return await geocodePostalCodeREST(postalCode)
    } catch (restError) {
      console.warn('REST API geocoding failed, trying JS SDK:', restError.message)
      // Fall through to try JS SDK
    }
  }

  // Try JS SDK as fallback
  try {
    // Ensure Google Maps API is loaded with geocoding library
    await loadMapsAPI(['maps', 'geocoding'])

    if (!window.google || !window.google.maps) {
      throw new Error('Google Maps JavaScript API is not loaded')
    }

    // Verify Geocoder is available
    if (!window.google.maps.Geocoder) {
      throw new Error('Geocoder class is not available. Make sure geocoding library is loaded.')
    }

    // Verify API key is set
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      throw new Error('API key not found. Make sure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set.')
    }

    return new Promise((resolve, reject) => {
      const geocoder = new window.google.maps.Geocoder()

      // Format: Singapore postal code
      const address = `Singapore ${postalCode}`

      geocoder.geocode(
        {
          address,
          region: 'sg', // Restrict to Singapore
          componentRestrictions: {
            country: 'SG',
          },
        },
        (results, status) => {
          if (status === window.google.maps.GeocoderStatus.OK) {
            if (results && results.length > 0) {
              const result = results[0]
              const location = result.geometry.location

              resolve({
                success: true,
                lat: location.lat(),
                lng: location.lng(),
                formattedAddress: result.formatted_address,
                postalCode,
                placeId: result.place_id,
              })
            } else {
              reject(new Error(`No results found for postal code: ${postalCode}`))
            }
          } else if (status === window.google.maps.GeocoderStatus.ZERO_RESULTS) {
            reject(new Error(`No results found for postal code: ${postalCode}`))
          } else if (status === window.google.maps.GeocoderStatus.REQUEST_DENIED) {
            // If REQUEST_DENIED, try REST API fallback if enabled
            if (useRestFallback) {
              console.warn('JS SDK Geocoding API denied, falling back to REST API')
              geocodePostalCodeREST(postalCode)
                .then(resolve)
                .catch(reject)
            } else {
              reject(
                new Error(
                  `Geocoding API denied. Please enable Geocoding API in Google Cloud Console. Status: ${window.google.maps.GeocoderStatus[status]}`
                )
              )
            }
          } else {
            reject(
              new Error(
                `Geocoding failed: ${window.google.maps.GeocoderStatus[status]}. ${status === window.google.maps.GeocoderStatus.REQUEST_DENIED ? 'Please enable Geocoding API in Google Cloud Console.' : ''}`
              )
            )
          }
        }
      )
    })
  } catch (error) {
    // If JS SDK fails and fallback is enabled, try REST API
    if (useRestFallback && error.message.includes('REQUEST_DENIED')) {
      console.warn('JS SDK failed, falling back to REST API:', error.message)
      try {
        return await geocodePostalCodeREST(postalCode)
      } catch (restError) {
        throw new Error(
          `Both JS SDK and REST API failed. JS SDK: ${error.message}. REST API: ${restError.message}. Please check your API key and ensure Geocoding API is enabled.`
        )
      }
    }
    throw error
  }
}

/**
 * Reverse geocode coordinates to address
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} { formattedAddress, postalCode }
 */
export async function reverseGeocode(lat, lng) {
  // Ensure Google Maps API is loaded
  await loadMapsAPI()

  if (!window.google || !window.google.maps) {
    throw new Error('Google Maps JavaScript API is not loaded')
  }

  return new Promise((resolve, reject) => {
    const geocoder = new window.google.maps.Geocoder()

    geocoder.geocode(
      {
        location: { lat, lng },
        region: 'sg',
      },
      (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK) {
          if (results && results.length > 0) {
            const result = results[0]
            // Extract postal code from address components
            let postalCode = null
            const postalComponent = result.address_components.find(
              (component) =>
                component.types.includes('postal_code') ||
                component.types.includes('postal_code_prefix')
            )
            if (postalComponent) {
              postalCode = postalComponent.long_name
            }

            resolve({
              success: true,
              formattedAddress: result.formatted_address,
              postalCode,
              placeId: result.place_id,
            })
          } else {
            reject(new Error('No results found for coordinates'))
          }
        } else {
          reject(
            new Error(
              `Reverse geocoding failed: ${window.google.maps.GeocoderStatus[status]}`
            )
          )
        }
      }
    )
  })
}
