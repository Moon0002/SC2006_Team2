'use client'

/**
 * Simple Map Component
 * Basic iframe-based Google Maps viewer using map-embed.html
 */
export default function SimpleMap({
  center = { lat: 1.3521, lng: 103.8198 }, // Singapore center
  zoom = 11,
  className = '',
  height = '400px',
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <p className="text-sm text-gray-600">API key not configured</p>
      </div>
    )
  }

  // Use the existing map-embed.html file
  const params = new URLSearchParams({
    apiKey: apiKey,
    lat: center.lat.toString(),
    lng: center.lng.toString(),
    zoom: zoom.toString(),
  })

  const mapUrl = `/map-embed.html?${params.toString()}`

  return (
    <div className={`w-full rounded-lg overflow-hidden border border-gray-200 ${className}`} style={{ height }}>
      <iframe
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={mapUrl}
        title="Google Map"
      />
    </div>
  )
}
