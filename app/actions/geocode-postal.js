'use server'

import { geocodePostalCode } from '@/lib/geocoding/google'

/**
 * Server action to geocode a postal code
 * @param {string} postalCode - 6-digit Singapore postal code
 * @returns {Promise<Object>} { success: boolean, lat?: number, lng?: number, error?: string }
 */
export async function geocodePostalCodeAction(postalCode) {
  try {
    if (!postalCode || postalCode.length !== 6) {
      return {
        success: false,
        error: 'Postal code must be 6 digits',
      }
    }

    const result = await geocodePostalCode(postalCode)
    
    return {
      success: true,
      lat: result.lat,
      lng: result.lng,
      formattedAddress: result.formattedAddress,
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return {
      success: false,
      error: error.message || 'Failed to geocode postal code',
    }
  }
}
