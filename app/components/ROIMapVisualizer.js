'use client'

// ROIMapVisualizer - Displays interactive map with store markers showing ROI calculations
import { useState, useEffect, useCallback } from 'react'
import { useBasketStore } from '@/lib/stores/basketStore'
import MapDisplayIframe from './MapDisplayIframe'
import { findTopStoresWithROI } from '@/app/actions/find-nearby-stores'
import { geocodePostalCodeAction } from '@/app/actions/geocode-postal'
import { Loader2, MapPin, TrendingUp, TrendingDown } from 'lucide-react'

export default function ROIMapVisualizer({
  originPostalCode,
  hourlyRate = 10,
  userId = null,
}) {
  const [storeROIs, setStoreROIs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mapCenter, setMapCenter] = useState({ lat: 1.3521, lng: 103.8198 })
  const [mapZoom, setMapZoom] = useState(11)
  const [originLocation, setOriginLocation] = useState(null)
  const { items: basketItems } = useBasketStore()

  useEffect(() => {
    async function geocodeOrigin() {
      if (!originPostalCode || originPostalCode.length !== 6) {
        setOriginLocation(null)
        return
      }

      try {
        const result = await geocodePostalCodeAction(originPostalCode)
        if (result.success && result.lat && result.lng) {
          const coords = { lat: result.lat, lng: result.lng }
          setOriginLocation(coords)
          setMapCenter(coords)
          setMapZoom(12)
        } else {
          console.error('Geocoding failed:', result.error)
          setOriginLocation(null)
        }
      } catch (err) {
        console.error('Error geocoding origin:', err)
        setOriginLocation(null)
      }
    }

    geocodeOrigin()
  }, [originPostalCode])

  const calculateStoreROIs = useCallback(async () => {
    if (!originPostalCode) {
      setError('Please provide origin postal code')
      return
    }

    if (!basketItems || basketItems.length === 0) {
      setError('Basket is empty. Add items to see store ROI.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const itemsForROI = basketItems.map((item) => ({
        item_id: item.item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        estimated_price: item.estimated_price,
        category: item.category,
      }))

      const result = await findTopStoresWithROI({
        basketItems: itemsForROI,
        originPostalCode,
        hourlyRate,
        userId,
      })

      if (result.success) {
        setStoreROIs(result.stores.slice(0, 3))
        
        if (result.stores.length > 0 && result.stores[0].store) {
          setMapCenter({
            lat: result.stores[0].store.lat,
            lng: result.stores[0].store.lng,
          })
          setMapZoom(12)
        }
      } else {
        setError(result.error || 'Failed to calculate store ROIs')
      }
    } catch (err) {
      console.error('Store ROI calculation error:', err)
      setError(err.message || 'An error occurred while calculating store ROIs')
    } finally {
      setLoading(false)
    }
  }, [basketItems, originPostalCode, hourlyRate, userId])

  const originMarker = originLocation
    ? {
        position: { lat: originLocation.lat, lng: originLocation.lng },
        title: 'Your Location',
        label: '📍 You',
        id: 'origin-location',
        isOrigin: true,
        infoWindow: `
              <div style="padding: 12px; min-width: 200px; font-family: Arial, sans-serif;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #1f2937;">
                  📍 Your Location
                </h3>
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
                  Postal Code: ${originPostalCode}
                </p>
                <p style="margin: 0; font-size: 12px; color: #6b7280;">
                  Starting point for ROI calculations
                </p>
              </div>
            `,
      }
    : null

  const storeMarkers = storeROIs.length > 0
    ? storeROIs
        .filter((item) => item.store && !item.roi.error)
        .slice(0, 3)
        .map((item) => {
          const { store, roi } = item
          const isWorthIt = roi.isWorthIt || roi.netROI > 0
          const absROI = Math.abs(roi.netROI)
          const label = isWorthIt ? `Save $${absROI.toFixed(2)}` : `-$${absROI.toFixed(2)}`

          return {
            position: { lat: store.lat, lng: store.lng },
            title: `${store.name} - ${label}`,
            label: label,
            roi: roi.netROI,
            id: store.id || store.placeId,
            infoWindow: `
              <div style="padding: 12px; min-width: 200px; font-family: Arial, sans-serif;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #1f2937;">
                  ${store.name}
                </h3>
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
                  ${store.address}
                </p>
                ${store.reviewCount ? `
                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
                    ⭐ ${store.rating?.toFixed(1) || 'N/A'} (${store.reviewCount} reviews)
                  </p>
                ` : ''}
                <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-size: 12px; color: #6b7280;">Item Savings:</span>
                    <span style="font-size: 12px; font-weight: bold; color: #10b981;">
                      +$${roi.totalGrossSavings.toFixed(2)}
                    </span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-size: 12px; color: #6b7280;">Transit Fare:</span>
                    <span style="font-size: 12px; font-weight: bold; color: #ef4444;">
                      -$${roi.transitFare.toFixed(2)}
                    </span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span style="font-size: 12px; color: #6b7280;">Time Cost:</span>
                    <span style="font-size: 12px; font-weight: bold; color: #ef4444;">
                      -$${roi.opportunityCost.toFixed(2)}
                    </span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 2px solid #e5e7eb;">
                    <span style="font-size: 14px; font-weight: bold; color: #1f2937;">Net ROI:</span>
                    <span style="font-size: 14px; font-weight: bold; color: ${isWorthIt ? '#10b981' : '#ef4444'};">
                      ${isWorthIt ? '+' : ''}$${roi.netROI.toFixed(2)}
                    </span>
                  </div>
                  ${store.postalCode && originPostalCode ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                      <button 
                        onclick="window.open('https://www.google.com/maps/dir/?api=1&origin=${originPostalCode}, Singapore&destination=${store.postalCode}, Singapore&travelmode=transit', '_blank', 'noopener,noreferrer')"
                        style="width: 100%; padding: 8px 12px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background-color 0.2s;"
                        onmouseover="this.style.backgroundColor='#2563eb'"
                        onmouseout="this.style.backgroundColor='#3b82f6'"
                      >
                        🗺️ Navigate (Transit)
                      </button>
                    </div>
                  ` : ''}
                </div>
              </div>
            `,
          }
        })
    : []

  const mapMarkers = originMarker
    ? [originMarker, ...storeMarkers]
    : storeMarkers

  return (
    <div className="w-full space-y-4">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Store ROI Map</h3>
            <p className="text-sm text-gray-600">
              {storeROIs.length > 0
                ? `Top ${storeROIs.length} stores (ranked by review count)`
                : 'Enter origin and basket items, then click "Calculate Store ROIs" to see top 3 stores'}
            </p>
          </div>
          <button
            onClick={calculateStoreROIs}
            disabled={loading || !originPostalCode || basketItems.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculating...
              </>
            ) : storeROIs.length > 0 ? (
              <>
                <MapPin className="w-4 h-4" />
                Recalculate ROIs
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4" />
                Calculate Store ROIs
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {storeROIs.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Top 3 Stores (by Review Count):</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {storeROIs.slice(0, 3).map((item) => {
                if (item.roi.error) return null
                const { store, roi } = item
                const isWorthIt = roi.isWorthIt || roi.netROI > 0
                return (
                  <div
                    key={store.id}
                    className={`p-2 rounded border ${
                      isWorthIt
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {store.name}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{store.chain}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {isWorthIt ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <span
                          className={`text-sm font-bold ${
                            isWorthIt ? 'text-green-700' : 'text-red-700'
                          }`}
                        >
                          {isWorthIt ? '+' : ''}${roi.netROI.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Interactive Map</h3>
        <MapDisplayIframe
          center={mapCenter}
          zoom={mapZoom}
          markers={mapMarkers}
          height="600px"
        />
      </div>
    </div>
  )
}
