/**
 * ROI Calculation Utilities
 * Core mathematical functions for calculating True Cost of grocery trips
 */

/**
 * Calculates gross savings from price difference
 * @param {number} baselinePrice - Price at local/convenience store (SGD per unit)
 * @param {number} targetPrice - Price at target supermarket (SGD per unit)
 * @param {number} quantity - Quantity of items
 * @returns {number} Gross savings in SGD (rounded to 2 decimal places)
 */
export function calculateGrossSavings(baselinePrice, targetPrice, quantity) {
  if (baselinePrice < 0 || targetPrice < 0 || quantity < 0) {
    throw new Error('Prices and quantity must be non-negative')
  }

  if (quantity === 0) {
    return 0
  }

  const savingsPerUnit = baselinePrice - targetPrice
  const totalSavings = savingsPerUnit * quantity

  return Math.round(totalSavings * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculates opportunity cost of travel time
 * @param {number} travelTimeHours - Travel time in hours (e.g., 0.5 for 30 minutes)
 * @param {number} hourlyRate - User's hourly rate in SGD (default: 10.00)
 * @returns {number} Opportunity cost in SGD (rounded to 2 decimal places)
 */
export function calculateOpportunityCost(travelTimeHours, hourlyRate = 10.0) {
  if (travelTimeHours < 0) {
    throw new Error('Travel time cannot be negative')
  }

  if (hourlyRate < 0) {
    throw new Error('Hourly rate cannot be negative')
  }

  if (travelTimeHours === 0 || hourlyRate === 0) {
    return 0
  }

  const opportunityCost = travelTimeHours * hourlyRate

  return Math.round(opportunityCost * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculates net ROI (True Cost)
 * Formula: Net ROI = Gross Savings - Transit Fare - Opportunity Cost
 * @param {number} grossSavings - Gross savings from price difference
 * @param {number} transitFare - Transit fare in SGD
 * @param {number} opportunityCost - Opportunity cost of travel time
 * @returns {number} Net ROI in SGD (rounded to 2 decimal places)
 */
export function calculateNetROI(grossSavings, transitFare, opportunityCost) {
  // Allow negative values (they represent net loss)
  const netROI = grossSavings - transitFare - opportunityCost

  return Math.round(netROI * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculates total basket value
 * @param {Array<Object>} basketItems - Array of basket items with price and quantity
 * @param {string} priceType - 'baseline' or 'target' to determine which price to use
 * @returns {number} Total basket value in SGD
 */
export function calculateBasketValue(basketItems, priceType = 'target') {
  if (!Array.isArray(basketItems)) {
    throw new Error('Basket items must be an array')
  }

  const total = basketItems.reduce((sum, item) => {
    const price = priceType === 'baseline' 
      ? (item.baselinePrice || item.estimated_price || 0)
      : (item.targetPrice || item.estimated_price || 0)
    
    const quantity = item.quantity || 0
    return sum + (price * quantity)
  }, 0)

  return Math.round(total * 100) / 100
}

/**
 * Calculates complete ROI breakdown for a grocery trip
 * @param {Object} params - Calculation parameters
 * @param {Array<Object>} params.basketItems - Basket items with prices and quantities
 * @param {number} params.transitFare - Transit fare in SGD
 * @param {number} params.travelTimeHours - Travel time in hours
 * @param {number} params.hourlyRate - User's hourly rate in SGD
 * @returns {Object} Complete ROI breakdown
 */
export function calculateCompleteROI({
  basketItems = [],
  transitFare = 0,
  travelTimeHours = 0,
  hourlyRate = 10.0,
}) {
  // Calculate gross savings for each item and sum
  const itemSavings = basketItems.map(item => {
    const baselinePrice = item.baselinePrice || item.estimated_price || 0
    const targetPrice = item.targetPrice || item.estimated_price || 0
    const quantity = item.quantity || 0
    
    return {
      itemId: item.item_id,
      itemName: item.item_name,
      quantity,
      baselinePrice,
      targetPrice,
      savingsPerUnit: baselinePrice - targetPrice,
      grossSavings: calculateGrossSavings(baselinePrice, targetPrice, quantity),
    }
  })

  const totalGrossSavings = itemSavings.reduce(
    (sum, item) => sum + item.grossSavings,
    0
  )

  // Calculate opportunity cost
  const opportunityCost = calculateOpportunityCost(travelTimeHours, hourlyRate)

  // Calculate net ROI
  const netROI = calculateNetROI(totalGrossSavings, transitFare, opportunityCost)

  // Calculate basket values
  const baselineBasketValue = calculateBasketValue(basketItems, 'baseline')
  const targetBasketValue = calculateBasketValue(basketItems, 'target')

  return {
    // Summary
    netROI,
    totalGrossSavings: Math.round(totalGrossSavings * 100) / 100,
    transitFare,
    opportunityCost,
    
    // Breakdown
    itemSavings,
    baselineBasketValue,
    targetBasketValue,
    
    // Metadata
    travelTimeHours,
    hourlyRate,
    itemCount: basketItems.length,
    totalQuantity: basketItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
    
    // Derived metrics
    savingsPercentage: baselineBasketValue > 0 
      ? Math.round((totalGrossSavings / baselineBasketValue) * 100 * 100) / 100
      : 0,
    isWorthIt: netROI > 0,
  }
}
