/**
 * Google Maps Marker Utilities
 * Helper functions for creating custom markers with ROI labels
 */

/**
 * Create a custom marker icon with ROI badge
 * @param {number} netROI - Net ROI value (positive or negative)
 * @param {string} label - Label text (e.g., "Save $5.50")
 * @returns {Object} Google Maps icon configuration
 */
export function createROIMarkerIcon(netROI, label = null) {
  const isPositive = netROI > 0
  const color = isPositive ? '#10b981' : '#ef4444' // Green or Red
  const bgColor = isPositive ? '#d1fae5' : '#fee2e2' // Light green or light red
  const textColor = isPositive ? '#065f46' : '#991b1b' // Dark green or dark red

  // Default label if not provided
  if (!label) {
    const absROI = Math.abs(netROI)
    label = isPositive ? `Save $${absROI.toFixed(2)}` : `-$${absROI.toFixed(2)}`
  }

  // Create SVG icon
  const svg = `
    <svg width="120" height="60" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
        </filter>
      </defs>
      <rect x="0" y="0" width="120" height="50" rx="8" fill="${color}" filter="url(#shadow)"/>
      <text x="60" y="30" font-family="Arial, sans-serif" font-size="12" font-weight="bold" 
            fill="white" text-anchor="middle" dominant-baseline="middle">${label}</text>
      <polygon points="55,50 60,60 65,50" fill="${color}"/>
    </svg>
  `

  // Convert SVG to data URL
  const svgBlob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(svgBlob)

  // Note: google.maps.Size and Point are created in the map context
  // This function returns the URL, size/anchor should be set in map context
  return {
    url: url,
    size: { width: 120, height: 60 },
    anchor: { x: 60, y: 60 }, // Anchor at bottom center
  }
}

/**
 * Create HTML marker content for Advanced Markers (if using new API)
 * @param {number} netROI - Net ROI value
 * @param {string} storeName - Store name
 * @returns {HTMLElement} HTML element for marker
 */
export function createROIMarkerHTML(netROI, storeName) {
  const isPositive = netROI > 0
  const color = isPositive ? '#10b981' : '#ef4444'
  const bgColor = isPositive ? '#d1fae5' : '#fee2e2'
  const textColor = isPositive ? '#065f46' : '#991b1b'
  const absROI = Math.abs(netROI)
  const label = isPositive ? `Save $${absROI.toFixed(2)}` : `-$${absROI.toFixed(2)}`

  const markerDiv = document.createElement('div')
  markerDiv.className = 'roi-marker'
  markerDiv.style.cssText = `
    background-color: ${color};
    color: white;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: bold;
    font-family: Arial, sans-serif;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    white-space: nowrap;
    position: relative;
  `

  // Add arrow pointer
  markerDiv.innerHTML = `
    <div style="position: relative;">
      ${label}
      <div style="
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 6px solid ${color};
      "></div>
    </div>
  `

  return markerDiv
}

/**
 * Get marker color based on ROI
 * @param {number} netROI - Net ROI value
 * @returns {string} Hex color code
 */
export function getROIColor(netROI) {
  return netROI > 0 ? '#10b981' : '#ef4444' // Green or Red
}

/**
 * Format ROI label
 * @param {number} netROI - Net ROI value
 * @returns {string} Formatted label
 */
export function formatROILabel(netROI) {
  const absROI = Math.abs(netROI)
  return netROI > 0 ? `Save $${absROI.toFixed(2)}` : `-$${absROI.toFixed(2)}`
}
