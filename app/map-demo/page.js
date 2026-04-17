'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { geocodePostalCode as geocodePostalCodeREST } from '@/lib/integrations/geocoding/google'
import { MapPin, Search, AlertCircle } from 'lucide-react'

// Use iframe-based map to avoid all hydration issues
import MapDisplayIframe from '@/components/MapDisplayIframe'

/**
 * Map Demo Page
 * Tests Google Maps integration and geocoding
 */
export default function MapDemoPage() {
  const [postalCode, setPostalCode] = useState('639798') // NTU
  const [mapCenter, setMapCenter] = useState({ lat: 1.3521, lng: 103.8198 })
  const [markers, setMarkers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [geocodedAddress, setGeocodedAddress] = useState(null)
  const [mapError, setMapError] = useState(null)

  // Check if Maps JavaScript API is enabled
  useEffect(() => {
    const checkMapsAPI = async () => {
      try {
        // Try to access the API key
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        if (!apiKey) {
          setMapError('API key not found. Check .env file and restart dev server.')
          return
        }

        // Check browser console for any errors
        console.log('Map Demo: Checking Maps JavaScript API...')
        console.log('Map Demo: API Key present:', !!apiKey, 'Length:', apiKey?.length)
      } catch (err) {
        console.error('Map Demo: Error checking API:', err)
      }
    }

    checkMapsAPI()
  }, [])

  const handleGeocode = async () => {
    if (!postalCode || postalCode.length !== 6) {
      setError('Please enter a valid 6-digit postal code')
      return
    }

    setLoading(true)
    setError(null)
    setGeocodedAddress(null)

    try {
      // Use REST API directly (more reliable than JS SDK for geocoding)
      // The JS SDK Geocoder has API key authentication issues, but REST API works perfectly
      const result = await geocodePostalCodeREST(postalCode)
      
      setMapCenter({ lat: result.lat, lng: result.lng })
      setGeocodedAddress(result.formattedAddress)
      
      // Add marker for the geocoded location
      setMarkers([
        {
          position: { lat: result.lat, lng: result.lng },
          title: `Postal Code: ${postalCode}`,
          label: postalCode,
          infoWindow: `
            <div class="p-2">
              <h3 class="font-semibold text-sm mb-1">Postal Code: ${postalCode}</h3>
              <p class="text-xs text-gray-600">${result.formattedAddress}</p>
              <p class="text-xs text-gray-500 mt-1">
                Coordinates: ${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}
              </p>
            </div>
          `,
        },
      ])
    } catch (err) {
      console.error('Geocoding error:', err)
      setError(err.message || 'Failed to geocode postal code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Google Maps Integration Demo
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Test geocoding and map display functionality
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Important Notice */}
        {mapError && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 mb-1">
                  Map Loading Issue Detected
                </p>
                <p className="text-xs text-yellow-700 mb-2">{mapError}</p>
                <div className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
                  <strong>Quick Fix:</strong>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    <li>Go to <a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console APIs</a></li>
                    <li>Search for "Maps JavaScript API"</li>
                    <li>Click "Enable"</li>
                    <li>Wait 2-3 minutes, then refresh this page</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="mb-6 bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Singapore Postal Code
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="639798"
                maxLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleGeocode()
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a 6-digit Singapore postal code (e.g., 639798 for NTU)
              </p>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleGeocode}
                disabled={loading || !postalCode || postalCode.length !== 6}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                {loading ? 'Geocoding...' : 'Geocode & Pan'}
              </button>
            </div>
          </div>

          {/* Geocoded Address Display */}
          {geocodedAddress && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Found:</strong> {geocodedAddress}
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Map Display */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Interactive Map
          </h2>
          <MapDisplayIframe
            center={mapCenter}
            zoom={15}
            markers={markers}
            height="500px"
          />
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Troubleshooting Map Loading:
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Open browser console (F12) to see detailed error messages</li>
            <li>Enable "Maps JavaScript API" in <a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noopener noreferrer" className="underline font-medium">Google Cloud Console</a></li>
            <li>Verify your API key is correct in .env file</li>
            <li>Restart dev server after changing .env: <code className="bg-blue-100 px-1 rounded">npm run dev</code></li>
            <li>Wait 2-3 minutes after enabling APIs for changes to propagate</li>
          </ol>
        </div>
      </main>
    </div>
  )
}
