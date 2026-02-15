/**
 * Google Maps JavaScript API Loader Utility
 * Securely loads the Google Maps SDK with proper configuration
 * Uses the new functional API (setOptions and importLibrary)
 */

import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

let mapsLoaded = false
let optionsSet = false

/**
 * Set Google Maps API options (API key, version, etc.)
 * @param {Object} customOptions - Optional custom options to override defaults
 */
export function setMapsOptions(customOptions = {}) {
  // In client-side code, access env var directly
  const apiKey = typeof window !== 'undefined' 
    ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    : process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    const error = 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured. Make sure it is set in your .env file and restart the dev server.'
    console.error(error)
    throw new Error(error)
  }

  if (!optionsSet) {
    try {
      setOptions({
        apiKey: apiKey.trim(),
        version: 'weekly',
        ...customOptions,
      })
      optionsSet = true
      console.log('Google Maps API options set successfully')
    } catch (error) {
      console.error('Failed to set Google Maps API options:', error)
      throw new Error(`Failed to configure Google Maps API: ${error.message}`)
    }
  }
}

/**
 * Load the Google Maps JavaScript API and required libraries
 * @param {string[]} libraries - Array of library names to load (default: ['maps', 'geocoding', 'geometry'])
 * @returns {Promise<Object>} Object containing loaded libraries
 */
export async function loadMapsAPI(libraries = ['maps', 'geocoding', 'geometry']) {
  // Check if already loaded
  if (mapsLoaded && typeof window !== 'undefined' && window.google && window.google.maps) {
    // Verify API key is still set
    if (!optionsSet) {
      setMapsOptions()
    }
    return Promise.resolve()
  }

  try {
    // Set options first - this is critical and must happen before any imports
    setMapsOptions()

    // Import required libraries
    const loadedLibraries = {}
    
    for (const library of libraries) {
      try {
        loadedLibraries[library] = await importLibrary(library)
        console.log(`Successfully loaded library: ${library}`)
      } catch (err) {
        console.error(`Failed to load library "${library}":`, err)
        // Don't throw here, continue with other libraries
      }
    }

    // Ensure maps library is loaded (required for everything)
    if (!loadedLibraries.maps && !window.google?.maps) {
      try {
        loadedLibraries.maps = await importLibrary('maps')
        console.log('Successfully loaded maps library as fallback')
      } catch (err) {
        throw new Error(`Failed to load required 'maps' library: ${err.message}`)
      }
    }

    // Verify the API is actually loaded
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      throw new Error('Google Maps API loaded but window.google.maps is not available')
    }

    mapsLoaded = true
    console.log('Google Maps JavaScript API loaded successfully')
    
    return loadedLibraries
  } catch (error) {
    console.error('Failed to load Google Maps JavaScript API:', error)
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    const hasKey = !!apiKey
    const keyLength = apiKey ? apiKey.length : 0
    
    throw new Error(
      `Google Maps API loading failed: ${error.message}. ` +
      `API Key present: ${hasKey}, Length: ${keyLength}. ` +
      `Make sure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set in .env and restart the dev server.`
    )
  }
}

/**
 * Check if Google Maps API is loaded
 * @returns {boolean}
 */
export function isMapsLoaded() {
  return typeof window !== 'undefined' && window.google && window.google.maps
}

/**
 * Reset the loader state (useful for testing or re-initialization)
 */
export function resetLoader() {
  mapsLoaded = false
  optionsSet = false
}
