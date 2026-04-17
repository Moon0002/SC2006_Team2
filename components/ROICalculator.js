'use client'

import { useState, useCallback, useEffect } from 'react'
import { useBasketStore } from '@/stores/basketStore'
import ROIComparisonTable from './ROIComparisonTable'
import HourlyRateSlider from './HourlyRateSlider'
import { calculateTripROI } from '@/lib/application/roi-calculator'
import { Loader2, Calculator } from 'lucide-react'
import { isValidPostalCode } from '@/lib/utils/validation'

/**
 * ROI Calculator Component
 * Integrates basket, transit fare, and hourly rate to calculate ROI
 */
export default function ROICalculator({
  originPostalCode,
  destinationPostalCode,
  hourlyRate: externalHourlyRate = 10,
  onHourlyRateChange,
  userId = null,
}) {
  const [hourlyRate, setHourlyRate] = useState(externalHourlyRate)
  
  // Sync with external hourly rate changes
  useEffect(() => {
    setHourlyRate(externalHourlyRate)
  }, [externalHourlyRate])
  const [roiData, setRoiData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { items: basketItems } = useBasketStore()

  // Calculate ROI when inputs change
  const calculateROI = useCallback(async () => {
    if (!originPostalCode || !destinationPostalCode) {
      setError('Please provide origin and destination postal codes')
      return
    }

    const originDigits = String(originPostalCode).replace(/\D/g, '')
    const destDigits = String(destinationPostalCode).replace(/\D/g, '')
    if (!isValidPostalCode(originDigits) || !isValidPostalCode(destDigits)) {
      setError('Please enter a valid 6-digit postal code.')
      return
    }

    if (!basketItems || basketItems.length === 0) {
      setError('Basket is empty. Add items to calculate ROI.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Prepare basket items for ROI calculation
      const itemsForROI = basketItems.map(item => ({
        item_id: item.item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        estimated_price: item.estimated_price,
        category: item.category,
      }))

      const result = await calculateTripROI({
        basketItems: itemsForROI,
        originPostalCode: originDigits,
        destinationPostalCode: destDigits,
        hourlyRate,
        userId,
      })

      if (result.success) {
        setRoiData(result)
      } else {
        setError(result.error || 'Failed to calculate ROI')
      }
    } catch (err) {
      console.error('ROI calculation error:', err)
      setError(err.message || 'An error occurred while calculating ROI')
    } finally {
      setLoading(false)
    }
  }, [basketItems, originPostalCode, destinationPostalCode, hourlyRate, userId])

  // Recalculate when hourly rate changes
  const handleHourlyRateChange = (newRate) => {
    setHourlyRate(newRate)
    // Notify parent component
    if (onHourlyRateChange) {
      onHourlyRateChange(newRate)
    }
    // Trigger recalculation if we already have data
    if (roiData) {
      // Update opportunity cost in existing data
      const updatedRoiData = {
        ...roiData,
        hourlyRate: newRate,
        opportunityCost: (roiData.travelTimeHours || 0) * newRate,
        netROI: roiData.totalGrossSavings - roiData.transitFare - ((roiData.travelTimeHours || 0) * newRate),
        isWorthIt: (roiData.totalGrossSavings - roiData.transitFare - ((roiData.travelTimeHours || 0) * newRate)) > 0,
      }
      setRoiData(updatedRoiData)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Hourly Rate Slider */}
      <HourlyRateSlider
        value={hourlyRate}
        onChange={handleHourlyRateChange}
        min={0}
        max={200}
        step={0.5}
      />

      {/* Calculate Button */}
      <div className="flex justify-center">
        <button
          onClick={calculateROI}
          disabled={loading || !originPostalCode || !destinationPostalCode || basketItems.length === 0}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-md"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Calculator className="w-5 h-5" />
              Calculate ROI
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* ROI Comparison Table */}
      {roiData && (
        <ROIComparisonTable
          roiData={{
            ...roiData,
            opportunityCost: (roiData.travelTimeHours || 0) * hourlyRate,
            netROI: roiData.totalGrossSavings - roiData.transitFare - ((roiData.travelTimeHours || 0) * hourlyRate),
            isWorthIt: (roiData.totalGrossSavings - roiData.transitFare - ((roiData.travelTimeHours || 0) * hourlyRate)) > 0,
          }}
          hourlyRate={hourlyRate}
        />
      )}

      {/* Empty State */}
      {!roiData && !loading && !error && (
        <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
          <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Ready to calculate ROI</p>
          <p className="text-sm text-gray-500 mt-2">
            Add items to your basket and click "Calculate ROI" to see the True Cost analysis
          </p>
        </div>
      )}
    </div>
  )
}
