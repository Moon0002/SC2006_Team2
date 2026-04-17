'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'

/**
 * MapDisplayIframe Component
 * Renders Google Map in an iframe to avoid hydration issues
 */
export default function MapDisplayIframe({
  center = { lat: 1.3521, lng: 103.8198 },
  zoom = 11,
  markers = [],
  className = '',
  height = '400px',
}) {
  const iframeRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Initialize iframe URL once when mounted (without markers in URL)
  // This should only run once to keep iframe constant
  useEffect(() => {
    if (!isMounted || !iframeRef.current) return

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setError('API key not configured')
      setIsLoading(false)
      return
    }

    // Build URL with only essential parameters (no markers to avoid URL length issues)
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID // Optional Map ID for Advanced Markers
    const params = new URLSearchParams({
      apiKey: apiKey,
      lat: center.lat.toString(),
      lng: center.lng.toString(),
      zoom: zoom.toString(),
    })
    
    // Add Map ID if available (required for Advanced Markers)
    if (mapId) {
      params.set('mapId', mapId)
    }

    const mapUrl = `/map-embed.html?${params.toString()}`
    
    // Only set src if iframe is empty (first load) - keep iframe constant
    // This ensures the iframe never reloads, only updates via postMessage
    if (!iframeRef.current.src || iframeRef.current.src === 'about:blank' || iframeRef.current.src === '') {
      iframeRef.current.src = mapUrl
      
      // Set loading timeout only once when iframe is first loaded
      const timeout = setTimeout(() => {
        setIsLoading((prevLoading) => {
          if (prevLoading) {
            setError('Map loading timeout. Check if Maps JavaScript API is enabled.')
            return false
          }
          return prevLoading
        })
      }, 15000)
      
      // Store timeout ID to clear it when map is ready
      iframeRef.current._timeoutId = timeout
    }

    // Listen for map ready message
    const handleMessage = (event) => {
      if (event.data.type === 'mapReady') {
        // Clear timeout if it exists
        if (iframeRef.current?._timeoutId) {
          clearTimeout(iframeRef.current._timeoutId)
          iframeRef.current._timeoutId = null
        }
        
        setIsLoading(false)
        setError(null)
        
        // Send markers via postMessage after map is ready (avoids URL length issues)
        if (markers && markers.length > 0 && iframeRef.current?.contentWindow) {
          setTimeout(() => {
            iframeRef.current?.contentWindow?.postMessage(
              {
                type: 'setMarkers',
                markers: markers.map((marker) => ({
                  position: marker.position || { lat: marker.lat, lng: marker.lng },
                  title: marker.title || '',
                  label: marker.label || '',
                  roi: marker.roi,
                  id: marker.id,
                  infoWindow: marker.infoWindow,
                })),
              },
              '*'
            )
          }, 500) // Small delay to ensure map is fully ready
        }
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
      // Clear timeout on unmount
      if (iframeRef.current?._timeoutId) {
        clearTimeout(iframeRef.current._timeoutId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted]) // Only run once on mount - iframe stays constant

  // Update map center when props change (debounced) - iframe stays constant
  useEffect(() => {
    if (!iframeRef.current || !isMounted) return

    const timeoutId = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'updateCenter',
          lat: center.lat,
          lng: center.lng,
          zoom: zoom,
        },
        '*'
      )
    }, 300) // Debounce updates

    return () => clearTimeout(timeoutId)
  }, [center.lat, center.lng, zoom, isMounted])

  // Update markers when they change (via postMessage - iframe stays constant)
  useEffect(() => {
    if (!iframeRef.current || !isMounted) return

    // Wait a bit to ensure iframe is ready, then send markers
    const timeoutId = setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'setMarkers',
            markers: markers && markers.length > 0 ? markers.map((marker) => ({
              position: marker.position || { lat: marker.lat, lng: marker.lng },
              title: marker.title || '',
              label: marker.label || '',
              roi: marker.roi,
              id: marker.id,
              isOrigin: marker.isOrigin || false,
              infoWindow: marker.infoWindow,
            })) : [], // Send empty array if no markers
          },
          '*'
        )
      }
    }, 500) // Wait longer to ensure map is ready

    return () => clearTimeout(timeoutId)
  }, [markers, isMounted])

  if (!isMounted) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Initializing...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-red-50 border border-red-200 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center p-4 max-w-md">
          <MapPin className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-800 font-medium mb-2">Map Error</p>
          <p className="text-xs text-red-600 mb-3">{error}</p>
          <div className="text-xs text-red-700 bg-red-100 p-2 rounded">
            <strong>Troubleshooting:</strong>
            <ul className="list-disc list-inside mt-1 text-left">
              <li>Enable "Maps JavaScript API" in Google Cloud Console</li>
              <li>Verify API key is correct in .env file</li>
              <li>Restart dev server after changing .env</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full rounded-lg overflow-hidden border border-gray-200 ${className}`} style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90 z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        title="Google Map"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}
