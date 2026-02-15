'use client'

// TopStoresROI - Finds top 3 stores by review count and calculates ROI for each store
import { useState, useCallback } from 'react'
import { useBasketStore } from '@/lib/stores/basketStore'
import { findTopStoresWithROI } from '@/app/actions/find-nearby-stores'
import ROIComparisonTable from './ROIComparisonTable'
import HourlyRateSlider from './HourlyRateSlider'
import { Loader2, Calculator, Star, MapPin, TrendingUp, TrendingDown } from 'lucide-react'

export default function TopStoresROI({
  originPostalCode,
  hourlyRate: externalHourlyRate = 10,
  onHourlyRateChange,
  userId = null,
}) {
  const [hourlyRate, setHourlyRate] = useState(externalHourlyRate)
  const [storesData, setStoresData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { items: basketItems } = useBasketStore()

  const handleHourlyRateChange = (newRate) => {
    setHourlyRate(newRate)
    if (onHourlyRateChange) {
      onHourlyRateChange(newRate)
    }
    if (storesData.length > 0) {
      recalculateROI(newRate)
    }
  }

  const recalculateROI = useCallback(async (newHourlyRate) => {
    if (!originPostalCode || basketItems.length === 0) return

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
        originPostalCode,
        basketItems: itemsForROI,
        hourlyRate: newHourlyRate,
        userId,
      })

      if (result.success) {
        setStoresData(result.stores)
      } else {
        setError(result.error || 'Failed to calculate store ROIs')
      }
    } catch (err) {
      console.error('ROI recalculation error:', err)
      setError(err.message || 'An error occurred while recalculating ROI')
    } finally {
      setLoading(false)
    }
  }, [basketItems, originPostalCode, userId])

  const findTopStores = useCallback(async () => {
    if (!originPostalCode) {
      setError('Please provide origin postal code')
      return
    }

    if (!basketItems || basketItems.length === 0) {
      setError('Basket is empty. Add items to calculate ROI.')
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
        originPostalCode,
        basketItems: itemsForROI,
        hourlyRate,
        userId,
      })

      if (result.success) {
        setStoresData(result.stores)
      } else {
        setError(result.error || 'Failed to find top stores')
      }
    } catch (err) {
      console.error('Top stores ROI calculation error:', err)
      setError(err.message || 'An error occurred while finding top stores')
    } finally {
      setLoading(false)
    }
  }, [basketItems, originPostalCode, hourlyRate, userId])

  return (
    <div className="w-full space-y-6">
      <HourlyRateSlider
        value={hourlyRate}
        onChange={handleHourlyRateChange}
        min={0}
        max={200}
        step={0.5}
      />

      <div className="flex justify-center">
        <button
          onClick={findTopStores}
          disabled={loading || !originPostalCode || basketItems.length === 0}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Finding Top Stores...
            </>
          ) : (
            <>
              <Calculator className="w-5 h-5" />
              Find Top 3 Stores by Reviews
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {storesData.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Top 3 Stores (Ranked by Review Count)
          </h3>
          
          {storesData.map((storeItem, index) => {
            const { store, roi } = storeItem
            return (
              <div
                key={store.id || store.placeId || index}
                  className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
              >
                <div className={`p-4 ${
                  roi.isWorthIt ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-bold text-gray-900">{store.name}</h4>
                        {roi.isWorthIt ? (
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{store.address}</span>
                        </div>
                        {store.reviewCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span>{store.reviewCount} reviews</span>
                            {store.rating && (
                              <span className="ml-1">({store.rating.toFixed(1)})</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        roi.isWorthIt ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {roi.isWorthIt ? '+' : ''}${roi.netROI.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Net ROI</div>
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <ROIComparisonTable
                    roiData={{
                      ...roi,
                      baselineBasketValue: roi.totalGrossSavings + roi.transitFare + roi.opportunityCost,
                      targetBasketValue: roi.totalGrossSavings,
                      savingsPercentage: ((roi.totalGrossSavings / (roi.totalGrossSavings + roi.transitFare + roi.opportunityCost)) * 100) || 0,
                    }}
                    hourlyRate={hourlyRate}
                    storeName={store.name}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {storesData.length === 0 && !loading && !error && (
        <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
          <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Ready to find top stores</p>
          <p className="text-sm text-gray-500 mt-2">
            Add items to your basket and click "Find Top 3 Stores" to see stores ranked by review count
          </p>
        </div>
      )}
    </div>
  )
}
