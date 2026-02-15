/**
 * Transit Node Mapping
 * Finds nearest bus stops and MRT stations for a given location
 */

import { fetchBusStops, fetchMrtStations } from './client'
import { calculateDistance } from '@/lib/geocoding/google'

/**
 * Finds the nearest bus stop to given coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} maxDistance - Maximum distance in meters (default: 500)
 * @param {Array} busStops - Array of bus stops (if not provided, will fetch)
 * @returns {Promise<Object|null>} Nearest bus stop or null if none found
 */
export async function findNearestBusStop(lat, lng, maxDistance = 500, busStops = null) {
  try {
    // If bus stops not provided, fetch a batch (you may want to cache this)
    if (!busStops) {
      const result = await fetchBusStops({ skip: 0 })
      if (!result.success || !result.data?.value) {
        return null
      }
      busStops = result.data.value
    }

    let nearestStop = null
    let minDistance = Infinity

    for (const stop of busStops) {
      // LTA API returns Latitude and Longitude fields
      const stopLat = parseFloat(stop.Latitude)
      const stopLng = parseFloat(stop.Longitude)

      if (isNaN(stopLat) || isNaN(stopLng)) {
        continue
      }

      const distance = calculateDistance(lat, lng, stopLat, stopLng)

      if (distance < minDistance && distance <= maxDistance) {
        minDistance = distance
        nearestStop = {
          ...stop,
          distance,
        }
      }
    }

    return nearestStop
  } catch (error) {
    console.error('Error finding nearest bus stop:', error)
    return null
  }
}

/**
 * Finds the nearest MRT station to given coordinates
 * Note: LTA DataMall may not have a direct MRT stations endpoint
 * This is a placeholder that can be enhanced with actual MRT station data
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} maxDistance - Maximum distance in meters (default: 1000)
 * @returns {Promise<Object|null>} Nearest MRT station or null
 */
export async function findNearestMrtStation(lat, lng, maxDistance = 1000) {
  // TODO: Implement MRT station lookup
  // LTA DataMall may require a different endpoint or static data
  // For now, return null as placeholder
  console.warn('MRT station lookup not yet implemented')
  return null
}

/**
 * Finds the nearest transit node (bus stop or MRT) to given coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Object} options - Options
 * @param {number} options.maxBusDistance - Max distance for bus stops in meters (default: 500)
 * @param {number} options.maxMrtDistance - Max distance for MRT in meters (default: 1000)
 * @returns {Promise<Object>} { busStop, mrtStation, nearest }
 */
export async function findNearestTransitNode(lat, lng, options = {}) {
  const {
    maxBusDistance = 500,
    maxMrtDistance = 1000,
  } = options

  const [busStop, mrtStation] = await Promise.all([
    findNearestBusStop(lat, lng, maxBusDistance),
    findNearestMrtStation(lat, lng, maxMrtDistance),
  ])

  // Determine which is nearest
  let nearest = null
  if (busStop && mrtStation) {
    nearest = busStop.distance < mrtStation.distance ? busStop : mrtStation
  } else if (busStop) {
    nearest = busStop
  } else if (mrtStation) {
    nearest = mrtStation
  }

  return {
    busStop,
    mrtStation,
    nearest,
  }
}
