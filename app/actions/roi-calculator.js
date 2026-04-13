'use server'

import { createClient } from '@/lib/supabase/server'
import { calculateFareBetweenPostalCodes, DEFAULT_FARE } from './transit-fare'
import { calculateCompleteROI } from '@/lib/roi/calculations'
import { getTransitTravelTimeHours } from '@/lib/maps/transit-time'
import {
  isValidPostalCode,
  isValidHourlyRate,
  validateBasketItemsForROI,
} from '@/lib/validation'

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
 * Time-based fare model:
 * Base price is $1.28 for the first 45 minutes (block),
 * then +$1.28 for each additional 45 minutes (rounded up).
 */
const TIME_FARE_BASE_SGD = 1.28
const TIME_FARE_BLOCK_MINUTES = 45

function calculateTimeBasedFareFromMinutes(minutes) {
  const mins = Number(minutes)
  if (!Number.isFinite(mins) || mins <= 0) {
    return {
      fare: TIME_FARE_BASE_SGD,
      blocks: 1,
      minutes: 0,
      model: 'time_based_fallback',
    }
  }

  const roundedMinutes = Math.max(0, Math.round(mins))
  const blocks = Math.max(1, Math.ceil(roundedMinutes / TIME_FARE_BLOCK_MINUTES))
  const fare = Math.round((blocks * TIME_FARE_BASE_SGD) * 100) / 100

  return {
    fare,
    blocks,
    minutes: roundedMinutes,
    model: 'time_based',
  }
}

function calculateTimeBasedFare(travelTimeHours) {
  const hours = Number(travelTimeHours)
  const minutes = Number.isFinite(hours) ? Math.round(hours * 60) : 0
  return calculateTimeBasedFareFromMinutes(minutes)
}

/**
 * Calculates ROI for a grocery trip
 * @param {Object} params - Calculation parameters
 * @param {Array<Object>} params.basketItems - Basket items with item_id and quantity
 * @param {string} params.originPostalCode - Origin postal code (6 digits)
 * @param {string} params.destinationPostalCode - Destination postal code (6 digits)
 * @param {string} params.martChain - Store chain/brand name (Cold Storage, FairPrice, Sheng Siong)
 * @param {number} params.hourlyRate - User's hourly rate (optional, uses profile or default)
 * @param {number} params.travelTimeHours - Travel time in hours (optional, estimated if not provided)
 * @param {string} params.userId - User ID for fetching profile (optional)
 * @returns {Promise<Object>} Complete ROI calculation result
 */
export async function calculateTripROI({
  basketItems = [],
  originPostalCode,
  destinationPostalCode,
  martChain = null,
  hourlyRate = null,
  travelTimeHours = null,
  userId = null,
}) {
  try {
    const basketValidation = validateBasketItemsForROI(basketItems)
    if (!basketValidation.ok) {
      return {
        success: false,
        error: basketValidation.error,
        netROI: 0,
        totalGrossSavings: 0,
        transitFare: 0,
        opportunityCost: 0,
      }
    }
    const sanitizedBasket = basketValidation.items

    const originClean = originPostalCode
      ? String(originPostalCode).replace(/\D/g, '')
      : ''
    const destClean = destinationPostalCode
      ? String(destinationPostalCode).replace(/\D/g, '')
      : ''
    if (originClean && !isValidPostalCode(originClean)) {
      return {
        success: false,
        error: 'Please enter a valid 6-digit postal code.',
        netROI: 0,
        totalGrossSavings: 0,
        transitFare: 0,
        opportunityCost: 0,
      }
    }
    if (destClean && !isValidPostalCode(destClean)) {
      return {
        success: false,
        error: 'Please enter a valid 6-digit postal code.',
        netROI: 0,
        totalGrossSavings: 0,
        transitFare: 0,
        opportunityCost: 0,
      }
    }

    // Step 1: Resolve hourly rate (explicit param, else profile, else default). Allow 0.
    let userHourlyRate = DEFAULT_HOURLY_RATE
    const explicitHourly =
      hourlyRate != null && hourlyRate !== '' && Number.isFinite(Number(hourlyRate))
    if (explicitHourly && isValidHourlyRate(Number(hourlyRate))) {
      userHourlyRate = Number(hourlyRate)
    } else if (userId) {
      try {
        const supabaseProfile = await createClient()
        const { data: profile, error } = await supabaseProfile
          .from('profiles')
          .select('hourly_rate')
          .eq('id', userId)
          .single()

        if (!error && profile?.hourly_rate != null) {
          const fromProfile = Number(profile.hourly_rate)
          if (isValidHourlyRate(fromProfile)) {
            userHourlyRate = fromProfile
          }
        }
      } catch (error) {
        console.warn('Could not fetch user profile, using default hourly rate:', error)
      }
    }

    if (!isValidHourlyRate(userHourlyRate)) {
      userHourlyRate = DEFAULT_HOURLY_RATE
    }

    // Step 2: Fetch item prices for basket items (SingStat)
    const supabase = await createClient()
    const itemIds = sanitizedBasket.map((item) => item.item_id).filter(Boolean)
    
    let priceByItemId = {}
    
    if (itemIds.length > 0) {
      const { data, error } = await supabase
        .from('singstat_data')
        .select('item_id, data_series, price_2026_jan, category_name, cpi_index')
        .in('item_id', itemIds)

      if (error) {
        console.error('Error fetching SingStat prices:', error)
      } else if (data) {
        // Create a map for quick lookup
        data.forEach((row) => {
          priceByItemId[row.item_id] = {
            item_id: row.item_id,
            item_name: row.data_series,
            estimated_price: row.price_2026_jan == null ? 0 : Number(row.price_2026_jan),
            category: row.category_name || 'Other',
            cpi_index: row.cpi_index == null ? null : Number(row.cpi_index),
          }
        })
      }
    }

    // Step 2.5: CPI average (weighted) and mart brand multiplier
    // Equation: Projected_Price = PriceOfGoods * (CPI_Avg / 102.04) * mart_brand
    // - PriceOfGoods: sum of selected goods (based on SingStat absolute prices)
    // - CPI_Avg: average cpi_index across selected goods (weighted by quantity)
    // - mart_brand multipliers:
    //   Cold Storage: 1.2, FairPrice: 1.0, Sheng Siong: 0.91
    const CPI_BASELINE_AVG = 102.04

    const normalizedChain = String(martChain || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')

    const martBrandMultiplier =
      normalizedChain.includes('cold storage') ? 1.2 :
      (normalizedChain.includes('fairprice')) ? 1.0 :
      (normalizedChain.includes('sheng siong') || normalizedChain.includes('shen siong')) ? 0.91 :
      // default
      1.0

    let weightedIndexSum = 0
    let weightedQtySum = 0
    for (const item of sanitizedBasket) {
      const qty = Number(item.quantity || 0)
      if (!Number.isFinite(qty) || qty <= 0) continue
      const index = Number(priceByItemId[item.item_id]?.cpi_index)
      if (!Number.isFinite(index)) continue
      weightedIndexSum += index * qty
      weightedQtySum += qty
    }
    const cpiAvg = weightedQtySum > 0 ? (weightedIndexSum / weightedQtySum) : CPI_BASELINE_AVG
    const cpiScale = cpiAvg / CPI_BASELINE_AVG

    // Step 3: Calculate transit fare (time-based)
    let transitFare = 0
    let transitData = null
    
    if (originClean && destClean) {
      try {
        const fareResult = await calculateFareBetweenPostalCodes(
          originClean,
          destClean
        )
        
        if (fareResult.success) {
          transitData = {
            fare: fareResult.fare,
            distanceKm: fareResult.distanceKm,
            method: fareResult.method,
          }
          
          // Estimate travel time if not provided:
          // Prefer Google Directions (transit) duration; fallback to rough speed estimate.
          if (!travelTimeHours) {
            const timeResult = await getTransitTravelTimeHours({
              originPostalCode: originClean,
              destinationPostalCode: destClean,
              roundTrip: true,
            })

            if (timeResult.success) {
              travelTimeHours = timeResult.travelTimeHours
              transitData = {
                ...transitData,
                travelTimeSource: timeResult.source,
                travelTimeRoundTrip: !!timeResult.roundTrip,
                travelTimeOneWayHours: timeResult.oneWayHours,
              }
            } else if (fareResult.distanceKm) {
              const averageSpeedKmh = 30 // Conservative estimate for public transport
              travelTimeHours = (fareResult.distanceKm / averageSpeedKmh) * 2 // Round trip
              transitData = {
                ...transitData,
                travelTimeSource: 'estimated_speed',
                travelTimeRoundTrip: true,
                travelTimeOneWayHours: Math.round(((travelTimeHours / 2) * 100)) / 100,
              }
            }
          }

          // Compute fares from time:
          // - oneWayFare is based on one-way time blocks
          // - transitFare used in ROI is round-trip (2x one-way fare)
          const oneWayHours = Number(transitData?.travelTimeOneWayHours) || (Number(travelTimeHours) / 2)
          const oneWayMinutes = Number.isFinite(oneWayHours) ? Math.round(oneWayHours * 60) : 0
          const oneWayFare = calculateTimeBasedFareFromMinutes(oneWayMinutes)
          transitFare = Math.round((oneWayFare.fare * 2) * 100) / 100
          transitData = {
            ...transitData,
            fare: transitFare,
            oneWayFare: oneWayFare.fare,
            oneWayMinutes,
            fareModel: oneWayFare.model,
            fareBlocks: oneWayFare.blocks,
            fareMinutes: oneWayFare.minutes,
            fareBase: TIME_FARE_BASE_SGD,
            fareBlockMinutes: TIME_FARE_BLOCK_MINUTES,
          }
        } else {
          console.warn('Transit fare calculation failed, using DEFAULT_FARE:', fareResult.error)
          transitFare =
            Number.isFinite(Number(fareResult.fare)) && Number(fareResult.fare) > 0
              ? Number(fareResult.fare)
              : DEFAULT_FARE
          transitData = {
            fare: transitFare,
            method: 'fallback',
            fareModel: 'default_fare',
            error: fareResult.error,
          }
        }
      } catch (error) {
        console.error('Error calculating transit fare:', error)
        transitFare = DEFAULT_FARE
        transitData = {
          fare: transitFare,
          method: 'fallback',
          fareModel: 'default_fare',
          error: error?.message || String(error),
        }
      }
    }

    // Use default travel time if not provided
    const finalTravelTimeHours = travelTimeHours || DEFAULT_TRAVEL_TIME_HOURS

    // Step 4: Prepare basket items with prices
    const enrichedBasketItems = sanitizedBasket.map((item) => {
      const priceData = priceByItemId[item.item_id] || {}
      
      // New model:
      // - baselinePrice (per unit) is the FairPrice projected price (mart_brand=1.0)
      // - targetPrice (per unit) is the selected mart chain projected price (mart_brand per chain)
      // - CPI scaling uses basket-level average CPI index (cpiAvg), relative to baseline 102.04
      const estimatedPrice = priceData.estimated_price || item.estimated_price || 0

      const baselinePrice = estimatedPrice * cpiScale * 1.0
      const targetPrice = estimatedPrice * cpiScale * martBrandMultiplier

      return {
        item_id: item.item_id,
        item_name: item.item_name || priceData.item_name || 'Unknown Item',
        quantity: item.quantity || 1,
        baselinePrice: Math.round(baselinePrice * 100) / 100,
        targetPrice: Math.round(targetPrice * 100) / 100,
        estimated_price: estimatedPrice,
        category: priceData.category || item.category || 'Other',
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
      martChain,
      martBrandMultiplier,
      cpiAvg: Math.round(cpiAvg * 1000) / 1000,
      cpiScale: Math.round(cpiScale * 100000) / 100000,
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
