/**
 * Transit Fare Caching Layer
 * Caches fare calculations to reduce API calls and improve performance
 */

import { createClient } from '@/lib/persistence/supabase/server'

/**
 * Generates a cache key for a postal code pair
 * @param {string} originPostalCode - Origin postal code
 * @param {string} destinationPostalCode - Destination postal code
 * @returns {string} Cache key
 */
function getCacheKey(originPostalCode, destinationPostalCode) {
  // Sort postal codes to ensure same key for A->B and B->A
  const sorted = [originPostalCode, destinationPostalCode].sort()
  return `fare:${sorted[0]}:${sorted[1]}`
}

/**
 * Gets cached fare from Supabase
 * @param {string} originPostalCode - Origin postal code
 * @param {string} destinationPostalCode - Destination postal code
 * @returns {Promise<Object|null>} Cached fare data or null
 */
export async function getCachedFare(originPostalCode, destinationPostalCode) {
  try {
    const supabase = await createClient()
    const cacheKey = getCacheKey(originPostalCode, destinationPostalCode)

    // For now, we'll use a simple in-memory cache
    // You can enhance this to use Supabase table for persistence
    // Check if cache exists in memory (in production, use Redis or Supabase)
    
    // Placeholder: Return null to indicate no cache
    // In production, implement actual caching logic here
    return null
  } catch (error) {
    console.error('Error getting cached fare:', error)
    return null
  }
}

/**
 * Stores fare in cache
 * @param {string} originPostalCode - Origin postal code
 * @param {string} destinationPostalCode - Destination postal code
 * @param {Object} fareData - Fare calculation result
 * @param {number} ttl - Time to live in seconds (default: 86400 = 24 hours)
 * @returns {Promise<boolean>} Success status
 */
export async function setCachedFare(originPostalCode, destinationPostalCode, fareData, ttl = 86400) {
  try {
    const cacheKey = getCacheKey(originPostalCode, destinationPostalCode)
    
    // Placeholder: In production, implement actual caching logic
    // You could:
    // 1. Store in Supabase table (fare_cache)
    // 2. Use Redis for faster access
    // 3. Use Next.js cache API
    
    // For now, just return success
    return true
  } catch (error) {
    console.error('Error setting cached fare:', error)
    return false
  }
}

/**
 * Simple in-memory cache implementation
 * Note: This is per-server instance and will be cleared on restart
 * For production, use a proper caching solution
 */
const memoryCache = new Map()

/**
 * Gets fare from in-memory cache
 * @param {string} originPostalCode - Origin postal code
 * @param {string} destinationPostalCode - Destination postal code
 * @returns {Object|null} Cached fare or null
 */
export function getMemoryCachedFare(originPostalCode, destinationPostalCode) {
  const cacheKey = getCacheKey(originPostalCode, destinationPostalCode)
  const cached = memoryCache.get(cacheKey)

  if (!cached) {
    return null
  }

  // Check if cache is expired
  if (Date.now() > cached.expiresAt) {
    memoryCache.delete(cacheKey)
    return null
  }

  return cached.data
}

/**
 * Stores fare in in-memory cache
 * @param {string} originPostalCode - Origin postal code
 * @param {string} destinationPostalCode - Destination postal code
 * @param {Object} fareData - Fare calculation result
 * @param {number} ttl - Time to live in seconds (default: 86400 = 24 hours)
 */
export function setMemoryCachedFare(originPostalCode, destinationPostalCode, fareData, ttl = 86400) {
  const cacheKey = getCacheKey(originPostalCode, destinationPostalCode)
  
  memoryCache.set(cacheKey, {
    data: fareData,
    expiresAt: Date.now() + (ttl * 1000),
  })
}
