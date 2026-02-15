/**
 * Generate Google Maps transit navigation deep link
 * @param {string} originPostalCode - Origin postal code (6 digits)
 * @param {string} destinationPostalCode - Destination postal code (6 digits)
 * @returns {string} Google Maps URL with transit mode
 */
export function generateTransitNavigationLink(originPostalCode, destinationPostalCode) {
  if (!originPostalCode || !destinationPostalCode) {
    console.warn('Missing postal codes for navigation link')
    return null
  }

  // Format postal codes (ensure 6 digits)
  const origin = originPostalCode.toString().padStart(6, '0').slice(0, 6)
  const destination = destinationPostalCode.toString().padStart(6, '0').slice(0, 6)

  // Google Maps Directions API deep link
  // Format: https://www.google.com/maps/dir/?api=1&origin={origin}&destination={destination}&travelmode=transit
  const baseUrl = 'https://www.google.com/maps/dir/'
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin}, Singapore`,
    destination: `${destination}, Singapore`,
    travelmode: 'transit',
  })

  return `${baseUrl}?${params.toString()}`
}

/**
 * Open Google Maps navigation in a new tab
 * @param {string} originPostalCode - Origin postal code
 * @param {string} destinationPostalCode - Destination postal code
 */
export function openTransitNavigation(originPostalCode, destinationPostalCode) {
  const url = generateTransitNavigationLink(originPostalCode, destinationPostalCode)
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  } else {
    console.error('Failed to generate navigation link')
  }
}
