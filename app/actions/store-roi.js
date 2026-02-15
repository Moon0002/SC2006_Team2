'use server'

import { calculateTripROI } from './roi-calculator'
import { SUPERMARKETS } from '@/lib/data/supermarkets'

/**
 * Calculate ROI for all stores given a basket and origin
 * @param {Object} params
 * @param {Array} params.basketItems - Array of basket items
 * @param {string} params.originPostalCode - Origin postal code
 * @param {number} params.hourlyRate - User's hourly rate
 * @param {string} params.userId - Optional user ID
 * @returns {Promise<Array>} Array of store ROI results
 */
export async function calculateAllStoreROI({
  basketItems,
  originPostalCode,
  hourlyRate = 10,
  userId = null,
}) {
  if (!basketItems || basketItems.length === 0) {
    return {
      success: false,
      error: 'Basket is empty',
      stores: [],
    }
  }

  if (!originPostalCode) {
    return {
      success: false,
      error: 'Origin postal code is required',
      stores: [],
    }
  }

  const results = []

  // Calculate ROI for each store
  for (const store of SUPERMARKETS) {
    try {
      const roiResult = await calculateTripROI({
        basketItems,
        originPostalCode,
        destinationPostalCode: store.postalCode,
        hourlyRate,
        userId,
      })

      if (roiResult.success) {
        results.push({
          store: {
            id: store.id,
            name: store.name,
            chain: store.chain,
            address: store.address,
            postalCode: store.postalCode,
            lat: store.lat,
            lng: store.lng,
            category: store.category,
          },
          roi: {
            netROI: roiResult.netROI,
            totalGrossSavings: roiResult.totalGrossSavings,
            transitFare: roiResult.transitFare,
            opportunityCost: roiResult.opportunityCost,
            isWorthIt: roiResult.isWorthIt,
            travelTimeHours: roiResult.travelTimeHours,
          },
        })
      } else {
        // Store with error - still include it but mark as failed
        results.push({
          store: {
            id: store.id,
            name: store.name,
            chain: store.chain,
            address: store.address,
            postalCode: store.postalCode,
            lat: store.lat,
            lng: store.lng,
            category: store.category,
          },
          roi: {
            netROI: 0,
            error: roiResult.error || 'Failed to calculate ROI',
          },
        })
      }
    } catch (error) {
      console.error(`Error calculating ROI for store ${store.id}:`, error)
      results.push({
        store: {
          id: store.id,
          name: store.name,
          chain: store.chain,
          address: store.address,
          postalCode: store.postalCode,
          lat: store.lat,
          lng: store.lng,
          category: store.category,
        },
        roi: {
          netROI: 0,
          error: error.message || 'Unknown error',
        },
      })
    }
  }

  // Sort by ROI (highest first)
  results.sort((a, b) => {
    const roiA = a.roi.netROI || 0
    const roiB = b.roi.netROI || 0
    return roiB - roiA
  })

  return {
    success: true,
    stores: results,
    totalStores: results.length,
    successfulCalculations: results.filter((r) => !r.roi.error).length,
  }
}
