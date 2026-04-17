'use client'

// ROIMapVisualizer - Displays interactive map with store markers showing ROI calculations
import { useState, useEffect } from 'react'
import { useBasketStore } from '@/stores/basketStore'
import MapDisplayIframe from './MapDisplayIframe'
import { geocodePostalCodeAction } from '@/lib/application/geocode-postal'
import { MapPin, TrendingUp, TrendingDown } from 'lucide-react'
import { useStoreRoiStore } from '@/stores/storeRoiStore'

function formatTravelTime(hours) {
  const h = Number(hours)
  if (!Number.isFinite(h) || h <= 0) return null
  const totalMinutes = Math.round(h * 60)
  const hh = Math.floor(totalMinutes / 60)
  const mm = totalMinutes % 60
  if (hh <= 0) return `${mm} min`
  return `${hh}h ${mm}m`
}

function formatTimeSummary(travelTimeHours, transitData) {
  const total = formatTravelTime(travelTimeHours)
  if (total) return `${total} (round trip)`
  const oneWayHours = Number(transitData?.travelTimeOneWayHours)
  if (Number.isFinite(oneWayHours) && oneWayHours > 0) {
    const roundTrip = formatTravelTime(oneWayHours * 2)
    if (roundTrip) return `${roundTrip} (round trip)`
  }
  return null
}

function formatFareBreakdown(transitData) {
  if (!transitData) return null
  const fare = Number(transitData.fare)
  if (Number.isFinite(fare) && fare > 0) {
    return `Fare $${fare.toFixed(2)} (round trip)`
  }
  const oneWayFare = Number(transitData.oneWayFare)
  if (!Number.isFinite(oneWayFare)) return null
  return `Fare $${(oneWayFare * 2).toFixed(2)} (round trip)`
}

export default function ROIMapVisualizer({
  originPostalCode,
  hourlyRate = 10,
  userId = null,
}) {
  const { storeROIs } = useStoreRoiStore()
  const [error, setError] = useState(null)
  const [mapCenter, setMapCenter] = useState({ lat: 1.3521, lng: 103.8198 })
  const [mapZoom, setMapZoom] = useState(11)
  const [originLocation, setOriginLocation] = useState(null)
  const [hasShownOnMap, setHasShownOnMap] = useState(false)
  const [showMostOptimalOnly, setShowMostOptimalOnly] = useState(false)
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

  // When new ROI results arrive (from `TopStoresROI`), reset map view toggles.
  useEffect(() => {
    setHasShownOnMap(false)
    setShowMostOptimalOnly(false)

    const first = storeROIs?.[0]?.store
    if (first?.lat && first?.lng) {
      setMapCenter({ lat: first.lat, lng: first.lng })
      setMapZoom(12)
    }
  }, [storeROIs])

  // ROI calculations are triggered by `TopStoresROI` (Find Nearby Stores).
  // This component only visualizes those precomputed results.

  const optimalItem = (() => {
    if (!storeROIs || storeROIs.length === 0) return null
    const candidates = storeROIs.filter(
      (x) => x?.store && !x?.roi?.error && Number.isFinite(x?.roi?.netROI),
    )
    if (candidates.length === 0) return null
    return candidates.reduce((best, cur) =>
      cur.roi.netROI > best.roi.netROI ? cur : best,
    )
  })()

  const optimalStoreId = optimalItem?.store?.id || optimalItem?.store?.placeId

  const originMarker = originLocation
    ? {
        position: { lat: originLocation.lat, lng: originLocation.lng },
        title: 'Your Location',
        label: 'You',
        id: 'origin-location',
        isOrigin: true,
        infoWindow: `
              <div style="padding: 12px; min-width: 200px; font-family: Arial, sans-serif;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: #1f2937;">
                   Your Location
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
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
                  Travel time: ${'\u{1F68C}'} ${formatTimeSummary(roi.travelTimeHours, roi.transitData) || 'N/A'}
                </p>
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
                  ${'\u{1F4B0}'} ${formatFareBreakdown(roi.transitData) || 'Fare N/A'}
                </p>
                ${store.reviewCount ? `
                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
                    ${'\u{2B50}'}${store.rating?.toFixed(1) || 'N/A'} (${store.reviewCount} reviews)
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
                  <!-- Fare breakdown shown above -->
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
                        Navigate (Transit)
                      </button>
                    </div>
                  ` : ''}
                </div>
              </div>
            `,
          }
        })
    : []

  const visibleStoreMarkers = showMostOptimalOnly && optimalStoreId
    ? storeMarkers.filter((m) => m.id === optimalStoreId)
    : storeMarkers

  const mapMarkers = originMarker
    ? hasShownOnMap
      ? [originMarker, ...visibleStoreMarkers]
      : [originMarker]
    : hasShownOnMap
      ? visibleStoreMarkers
      : []

  return (
    <div className="w-full space-y-4">
      {storeROIs.length > 0 && (
        <div className="flex items-center justify-end">
          <button
            onClick={() => {
              setHasShownOnMap(true)
              setShowMostOptimalOnly(false)
            }}
            disabled={!originPostalCode || basketItems.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            Show on Map
          </button>
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          onClick={() => {
            if (!optimalItem) return
            setShowMostOptimalOnly(true)
            setHasShownOnMap(true)
            // Center map on the optimal store for convenience.
            setMapCenter({ lat: optimalItem.store.lat, lng: optimalItem.store.lng })
            setMapZoom(13)
          }}
          disabled={!hasShownOnMap || !optimalItem}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          Show Most Optimal
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {storeROIs.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {storeROIs.map((item) => {
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
                      <p className="text-[11px] text-gray-600 truncate inline-flex items-center gap-0.5 max-w-full">
                        <span aria-hidden="true">{'\u{1F68C}'}</span>
                        <span className="truncate">
                          {formatTimeSummary(roi.travelTimeHours, roi.transitData) || 'N/A'}
                        </span>
                      </p>
                      {roi.transitData && formatFareBreakdown(roi.transitData) && (
                        <p className="text-[11px] text-gray-600 truncate inline-flex items-center gap-0.5 max-w-full">
                          <span aria-hidden="true">{'\u{1F4B0}'}</span>
                          <span className="truncate">{formatFareBreakdown(roi.transitData)}</span>
                        </p>
                      )}
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
