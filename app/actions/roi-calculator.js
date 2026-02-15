'use server'

import { createClient } from '@/lib/supabase/server'
import { calculateFareBetweenPostalCodes } from './transit-fare'
import { calculateCompleteROI } from '@/lib/roi/calculations'

/**
 * Default hourly rate if user hasn't set one
 */
const DEFAULT_HOURLY_RATE = 10.0

/**
 * Default travel time estimate (in hours) if not provided
 * Assumes 30 minutes round trip = 0.5 hours
 */
const DEFAULT_TRAVEL_TIME_HOURS = 0.5

/**
 * Calculates ROI for a grocery trip
 * @param {Object} params - Calculation parameters
 * @param {Array<Object>} params.basketItems - Basket items with item_id and quantity
 * @param {string} params.originPostalCode - Origin postal code (6 digits)
 * @param {string} params.destinationPostalCode - Destination postal code (6 digits)
 * @param {number} params.hourlyRate - User's hourly rate (optional, uses profile or default)
 * @param {number} params.travelTimeHours - Travel time in hours (optional, estimated if not provided)
 * @param {string} params.userId - User ID for fetching profile (optional)
 * @returns {Promise<Object>} Complete ROI calculation result
 */
export async function calculateTripROI({
  basketItems = [],
  originPostalCode,
  destinationPostalCode,
  hourlyRate = null,
  travelTimeHours = null,
  userId = null,
}) {
  try {
    // Step 1: Get user profile if userId provided
    let userHourlyRate = hourlyRate || DEFAULT_HOURLY_RATE
    
    if (userId && !hourlyRate) {
      try {
        const supabase = await createClient()
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('hourly_rate')
          .eq('id', userId)
          .single()

        if (!error && profile?.hourly_rate) {
          userHourlyRate = parseFloat(profile.hourly_rate) || DEFAULT_HOURLY_RATE
        }
      } catch (error) {
        console.warn('Could not fetch user profile, using default hourly rate:', error)
      }
    }

    // Step 2: Fetch CPI prices for basket items
    const supabase = await createClient()
    const itemIds = basketItems.map(item => item.item_id).filter(Boolean)
    
    let cpiPrices = {}
    
    if (itemIds.length > 0) {
      const { data, error } = await supabase
        .from('cpi_cache')
        .select('item_id, item_name, estimated_price, category')
        .in('item_id', itemIds)

      if (error) {
        console.error('Error fetching CPI prices:', error)
      } else if (data) {
        // Create a map for quick lookup
        data.forEach(item => {
          cpiPrices[item.item_id] = item
        })
      }
    }

    // Step 3: Calculate transit fare
    let transitFare = 0
    let transitData = null
    
    if (originPostalCode && destinationPostalCode) {
      try {
        const fareResult = await calculateFareBetweenPostalCodes(
          originPostalCode,
          destinationPostalCode
        )
        
        if (fareResult.success) {
          transitFare = fareResult.fare
          transitData = {
            fare: fareResult.fare,
            distanceKm: fareResult.distanceKm,
            method: fareResult.method,
          }
          
          // Estimate travel time if not provided (rough estimate: 30km/h average speed)
          if (!travelTimeHours && fareResult.distanceKm) {
            const averageSpeedKmh = 30 // Conservative estimate for public transport
            travelTimeHours = (fareResult.distanceKm / averageSpeedKmh) * 2 // Round trip
          }
        } else {
          console.warn('Transit fare calculation failed, using default:', fareResult.error)
          transitFare = 2.0 // Default fallback
        }
      } catch (error) {
        console.error('Error calculating transit fare:', error)
        transitFare = 2.0 // Default fallback
      }
    }

    // Use default travel time if not provided
    const finalTravelTimeHours = travelTimeHours || DEFAULT_TRAVEL_TIME_HOURS

    // Step 4: Prepare basket items with prices
    const enrichedBasketItems = basketItems.map(item => {
      const cpiData = cpiPrices[item.item_id] || {}
      
      // For now, we'll use the same price for both baseline and target
      // In a real scenario, you'd have different prices for convenience stores vs supermarkets
      // This is a placeholder - you may want to add a price multiplier or separate price source
      const estimatedPrice = cpiData.estimated_price || item.estimated_price || 0
      
      // Assume convenience stores are 20% more expensive (baseline)
      const baselinePrice = estimatedPrice * 1.2
      const targetPrice = estimatedPrice

      return {
        item_id: item.item_id,
        item_name: item.item_name || cpiData.item_name || 'Unknown Item',
        quantity: item.quantity || 1,
        baselinePrice: Math.round(baselinePrice * 100) / 100,
        targetPrice: Math.round(targetPrice * 100) / 100,
        estimated_price: estimatedPrice,
        category: cpiData.category || item.category || 'Other',
      }
    })

    // Step 5: Calculate ROI
    const roiResult = calculateCompleteROI({
      basketItems: enrichedBasketItems,
      transitFare,
      travelTimeHours: finalTravelTimeHours,
      hourlyRate: userHourlyRate,
    })

    return {
      success: true,
      ...roiResult,
      transitData,
      originPostalCode,
      destinationPostalCode,
      hourlyRate: userHourlyRate,
      travelTimeHours: finalTravelTimeHours,
    }
  } catch (error) {
    console.error('Error calculating trip ROI:', error)
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      netROI: 0,
      totalGrossSavings: 0,
      transitFare: 0,
      opportunityCost: 0,
    }
  }
}

/**
 * Quick ROI calculation for a single item
 * @param {string} itemId - Item ID
 * @param {number} quantity - Quantity
 * @param {string} originPostalCode - Origin postal code
 * @param {string} destinationPostalCode - Destination postal code
 * @param {number} hourlyRate - Hourly rate (optional)
 * @returns {Promise<Object>} ROI result
 */
export async function calculateItemROI(
  itemId,
  quantity,
  originPostalCode,
  destinationPostalCode,
  hourlyRate = null
) {
  return calculateTripROI({
    basketItems: [{ item_id: itemId, quantity }],
    originPostalCode,
    destinationPostalCode,
    hourlyRate,
  })
}
