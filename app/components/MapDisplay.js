'use client'

import { useEffect, useRef, useState } from 'react'
import { loadMapsAPI } from '@/lib/maps/loader'
import { Loader2, MapPin } from 'lucide-react'

/**
 * MapDisplay Component
 * Renders a Google Map centered on Singapore with marker support
 * Client-side only to avoid hydration mismatches
 */
export default function MapDisplay({
  center = { lat: 1.3521, lng: 103.8198 }, // Singapore center
  zoom = 11,
  markers = [],
  onMapReady = null,
  className = '',
  height = '400px',
  loading = false,
}) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isMounted, setIsMounted] = useState(false)

  // Ensure component only renders on client to avoid hydration issues
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Initialize map
  useEffect(() => {
    let isMounted = true
    let timeoutId = null

    async function initMap() {
      // Wait for ref to be attached to DOM
      if (!mapRef.current) {
        // Use requestAnimationFrame to wait for next render cycle
        requestAnimationFrame(() => {
          if (mapRef.current && isMounted) {
            initMap()
          }
        })
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        console.log('MapDisplay: Starting map initialization...')

        // Add timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.error('MapDisplay: Timeout waiting for Google Maps API')
            setError(
              'Map loading timeout. Please check: 1) Maps JavaScript API is enabled in Google Cloud Console, 2) API key is correct, 3) Check browser console for errors'
            )
            setIsLoading(false)
          }
        }, 15000) // 15 second timeout

        // Load Google Maps API
        console.log('MapDisplay: Loading Google Maps API...')
        await loadMapsAPI(['maps'])
        console.log('MapDisplay: Google Maps API loaded')

        if (!isMounted) {
          console.warn('MapDisplay: Component unmounted during load')
          return
        }

        // Double-check ref is still available
        if (!mapRef.current) {
          throw new Error('Map container element is not available')
        }

        if (!window.google || !window.google.maps) {
          throw new Error(
            'Google Maps JavaScript API is not available. Make sure Maps JavaScript API is enabled in Google Cloud Console.'
          )
        }

        console.log('MapDisplay: Creating map instance...')
        // Create map instance
        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        })

        mapInstanceRef.current = map
        console.log('MapDisplay: Map instance created successfully')

        // Call onMapReady callback if provided
        if (onMapReady) {
          onMapReady(map)
        }

        if (timeoutId) clearTimeout(timeoutId)
        setIsLoading(false)
      } catch (err) {
        console.error('MapDisplay: Map initialization error:', err)
        if (timeoutId) clearTimeout(timeoutId)
        if (isMounted) {
          setError(
            err.message ||
              'Failed to load map. Check browser console and ensure Maps JavaScript API is enabled.'
          )
          setIsLoading(false)
        }
      }
    }

    // Only initialize if not in loading state (controlled by parent)
    if (!loading) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (isMounted) {
          initMap()
        }
      }, 100)

      return () => {
        isMounted = false
        clearTimeout(timer)
        if (timeoutId) clearTimeout(timeoutId)
      }
    }

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [center, zoom, onMapReady, loading])

  // Update map center when prop changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setCenter(center)
    }
  }, [center])

  // Update map zoom when prop changes
  useEffect(() => {
    if (mapInstanceRef.current && zoom) {
      mapInstanceRef.current.setZoom(zoom)
    }
  }, [zoom])

  // Update markers when prop changes
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      marker.setMap(null)
    })
    markersRef.current = []

    // Add new markers
    if (markers && markers.length > 0) {
      markers.forEach((markerData) => {
        // Create custom icon if ROI data is provided
        let icon = markerData.icon
        if (markerData.roi !== undefined && !icon) {
          const netROI = markerData.roi
          const isPositive = netROI > 0
          const color = isPositive ? '#10b981' : '#ef4444'
          const absROI = Math.abs(netROI)
          const label = isPositive ? `Save $${absROI.toFixed(2)}` : `-$${absROI.toFixed(2)}`
          
          // Create SVG icon
          const svg = `
            <svg width="120" height="60" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="shadow${markerData.id || Math.random()}" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
                </filter>
              </defs>
              <rect x="0" y="0" width="120" height="50" rx="8" fill="${color}" filter="url(#shadow${markerData.id || Math.random()})"/>
              <text x="60" y="30" font-family="Arial, sans-serif" font-size="12" font-weight="bold" 
                    fill="white" text-anchor="middle" dominant-baseline="middle">${label}</text>
              <polygon points="55,50 60,60 65,50" fill="${color}"/>
            </svg>
          `
          
          const svgBlob = new Blob([svg], { type: 'image/svg+xml' })
          const url = URL.createObjectURL(svgBlob)
          
          icon = {
            url: url,
            scaledSize: new window.google.maps.Size(120, 60),
            anchor: new window.google.maps.Point(60, 60),
          }
        }

        const marker = new window.google.maps.Marker({
          position: markerData.position || { lat: markerData.lat, lng: markerData.lng },
          map: mapInstanceRef.current,
          title: markerData.title || '',
          label: markerData.label || '',
          icon: icon,
        })

        // Add info window if provided
        if (markerData.infoWindow) {
          const infoWindow = new window.google.maps.InfoWindow({
            content: markerData.infoWindow,
          })

          marker.addListener('click', () => {
            infoWindow.open(mapInstanceRef.current, marker)
          })
        }

        markersRef.current.push(marker)
      })
    }
  }, [markers])

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Initializing map...</p>
        </div>
      </div>
    )
  }

  if (loading || isLoading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading map...</p>
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
              <li>Open browser console (F12) to see detailed errors</li>
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
    <div
      ref={mapRef}
      className={`w-full rounded-lg overflow-hidden border border-gray-200 ${className}`}
      style={{ height }}
    />
  )
}
