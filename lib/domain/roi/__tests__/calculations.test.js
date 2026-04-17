/**
 * ROI Calculation Tests
 * Tests for edge cases and mathematical accuracy
 * 
 * Note: This is a basic test structure. For full testing, install and configure Vitest:
 * npm install -D vitest
 * Then run: npm test
 */

import {
  calculateGrossSavings,
  calculateOpportunityCost,
  calculateNetROI,
  calculateCompleteROI,
} from '../calculations'

// Test helper to run tests (basic implementation)
function test(name, fn) {
  try {
    fn()
    console.log(`✅ ${name}`)
  } catch (error) {
    console.error(`❌ ${name}:`, error.message)
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`)
      }
    },
    toBeCloseTo(expected, precision = 2) {
      const diff = Math.abs(actual - expected)
      const threshold = Math.pow(10, -precision)
      if (diff > threshold) {
        throw new Error(`Expected ${expected} (±${threshold}), got ${actual}`)
      }
    },
    toBeGreaterThan(expected) {
      if (actual <= expected) {
        throw new Error(`Expected > ${expected}, got ${actual}`)
      }
    },
    toBeLessThan(expected) {
      if (actual >= expected) {
        throw new Error(`Expected < ${expected}, got ${actual}`)
      }
    },
  }
}

// Test Suite
export function runROITests() {
  console.log('Running ROI Calculation Tests...\n')

  // Test 1: Basic Gross Savings Calculation
  test('calculateGrossSavings: $10 baseline - $8 target * 2 qty = $4 savings', () => {
    const result = calculateGrossSavings(10, 8, 2)
    expect(result).toBe(4.0)
  })

  // Test 2: Zero Quantity
  test('calculateGrossSavings: Zero quantity returns zero', () => {
    const result = calculateGrossSavings(10, 8, 0)
    expect(result).toBe(0)
  })

  // Test 3: Negative Savings (target more expensive)
  test('calculateGrossSavings: Negative savings when target is more expensive', () => {
    const result = calculateGrossSavings(8, 10, 2)
    expect(result).toBe(-4.0)
  })

  // Test 4: Opportunity Cost Calculation
  test('calculateOpportunityCost: 0.5 hours * $10/hr = $5', () => {
    const result = calculateOpportunityCost(0.5, 10)
    expect(result).toBe(5.0)
  })

  // Test 5: Zero Travel Time
  test('calculateOpportunityCost: Zero travel time returns zero', () => {
    const result = calculateOpportunityCost(0, 10)
    expect(result).toBe(0)
  })

  // Test 6: Zero Hourly Rate
  test('calculateOpportunityCost: Zero hourly rate returns zero', () => {
    const result = calculateOpportunityCost(0.5, 0)
    expect(result).toBe(0)
  })

  // Test 7: Net ROI Calculation
  test('calculateNetROI: $10 savings - $3 fare - $5 time = $2 ROI', () => {
    const result = calculateNetROI(10, 3, 5)
    expect(result).toBe(2.0)
  })

  // Test 8: Negative ROI (not worth it)
  test('calculateNetROI: Negative ROI when costs exceed savings', () => {
    const result = calculateNetROI(5, 3, 5)
    expect(result).toBe(-3.0)
  })

  // Test 9: Complete ROI with empty basket
  test('calculateCompleteROI: Empty basket returns zero values', () => {
    const result = calculateCompleteROI({
      basketItems: [],
      transitFare: 2,
      travelTimeHours: 0.5,
      hourlyRate: 10,
    })
    
    expect(result.netROI).toBe(-7.0) // -$2 fare - $5 time = -$7
    expect(result.totalGrossSavings).toBe(0)
    expect(result.itemCount).toBe(0)
  })

  // Test 10: Complete ROI with single item
  test('calculateCompleteROI: Single item calculation', () => {
    const result = calculateCompleteROI({
      basketItems: [
        {
          item_id: 'milk',
          item_name: 'Milk',
          quantity: 2,
          baselinePrice: 5.0,
          targetPrice: 4.0,
        },
      ],
      transitFare: 2.0,
      travelTimeHours: 0.5,
      hourlyRate: 10.0,
    })
    
    expect(result.totalGrossSavings).toBe(2.0) // (5-4) * 2 = $2
    expect(result.transitFare).toBe(2.0)
    expect(result.opportunityCost).toBe(5.0) // 0.5 * 10
    expect(result.netROI).toBe(-5.0) // 2 - 2 - 5 = -$5
    expect(result.isWorthIt).toBe(false)
  })

  // Test 11: Edge case - Missing price data
  test('calculateCompleteROI: Handles missing prices gracefully', () => {
    const result = calculateCompleteROI({
      basketItems: [
        {
          item_id: 'unknown',
          item_name: 'Unknown Item',
          quantity: 1,
          baselinePrice: 0,
          targetPrice: 0,
        },
      ],
      transitFare: 2.0,
      travelTimeHours: 0.5,
      hourlyRate: 10.0,
    })
    
    expect(result.totalGrossSavings).toBe(0)
    expect(result.netROI).toBe(-7.0) // -$2 fare - $5 time
  })

  // Test 12: Large quantities
  test('calculateGrossSavings: Large quantities calculate correctly', () => {
    const result = calculateGrossSavings(10, 8, 100)
    expect(result).toBe(200.0)
  })

  // Test 13: Decimal precision
  test('calculateGrossSavings: Handles decimal prices correctly', () => {
    const result = calculateGrossSavings(10.99, 8.49, 3)
    expect(result).toBeCloseTo(7.5, 1) // (10.99 - 8.49) * 3 = 7.5
  })

  // Test 14: Very long travel time
  test('calculateOpportunityCost: Long travel time calculation', () => {
    const result = calculateOpportunityCost(2.5, 20) // 2.5 hours at $20/hr
    expect(result).toBe(50.0)
  })

  // Test 15: ROI with zero transit fare
  test('calculateNetROI: Zero transit fare still calculates correctly', () => {
    const result = calculateNetROI(10, 0, 5)
    expect(result).toBe(5.0)
  })

  console.log('\n✅ All tests completed!')
}

// Export for use in development
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  // Can be called from API route for testing
  runROITests()
}
