'use server'

import { geocodePostalCode } from '@/lib/integrations/geocoding/google'
import { isValidPostalCode } from '@/lib/utils/validation'

/**
 * Server action to geocode a postal code
 * @param {string} postalCode - 6-digit Singapore postal code
 * @returns {Promise<Object>} { success: boolean, lat?: number, lng?: number, error?: string }
 */
export async function geocodePostalCodeAction(postalCode) {
  try {
    const digits = String(postalCode ?? '').replace(/\D/g, '')
    if (!isValidPostalCode(digits)) {
      return {
        success: false,
        error: 'Postal code must be a valid 6-digit number',
      }
    }

    const result = await geocodePostalCode(digits)
    
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
