/**
 * Google Maps transit travel time helper (server-side)
 *
 * Uses Google Directions API (REST) to estimate transit duration between two postal codes.
 * Requires `GOOGLE_MAPS_API_KEY` (server key without referrer restrictions).
 *
 * Notes:
 * - Transit routing requires billing + Directions API enabled.
 * - Results are cached in-memory to reduce API calls.
 */

import { POSTAL_CODE_REGEX } from '@/lib/utils/validation'

const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json'

// Simple in-memory cache (resets on restart / serverless cold start)
const _cache = new Map()

function cacheKey(originPostalCode, destinationPostalCode, roundTrip) {
  // Include roundTrip in the cache key so we never mix one-way and round-trip durations.
  return `${String(originPostalCode)}->${String(destinationPostalCode)}::${roundTrip ? 'rt' : 'ow'}`
}

/**
 * @param {Object} params
 * @param {string} params.originPostalCode
 * @param {string} params.destinationPostalCode
 * @param {boolean} [params.roundTrip=true] whether to double duration
 * @param {number} [params.ttlSeconds=86400] cache TTL
 * @returns {Promise<{success: true, travelTimeHours: number, source: string} | {success: false, error: string}>}
 */
export async function getTransitTravelTimeHours({
  originPostalCode,
  destinationPostalCode,
  roundTrip = true,
  ttlSeconds = 86400,
}) {
  try {
    const o = String(originPostalCode ?? '').replace(/\D/g, '')
    const d = String(destinationPostalCode ?? '').replace(/\D/g, '')
    if (!POSTAL_CODE_REGEX.test(o) || !POSTAL_CODE_REGEX.test(d)) {
      return { success: false, error: 'Invalid postal code(s)' }
    }

    const key = cacheKey(o, d, roundTrip)
    const now = Date.now()
    const cached = _cache.get(key)
    if (cached && cached.expiresAtMs > now) {
      return {
        success: true,
        travelTimeHours: cached.travelTimeHours,
        oneWayHours: cached.oneWayHours,
        roundTrip,
        source: 'cache',
      }
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Missing GOOGLE_MAPS_API_KEY for server-side Directions API' }
    }

    const url = new URL(DIRECTIONS_URL)
    url.searchParams.set('origin', `${o}, Singapore`)
    url.searchParams.set('destination', `${d}, Singapore`)
    url.searchParams.set('mode', 'transit')
    url.searchParams.set('region', 'sg')
    url.searchParams.set('key', apiKey.trim())

    const resp = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (!resp.ok) {
      return { success: false, error: `Directions API HTTP ${resp.status}: ${resp.statusText}` }
    }

    const data = await resp.json()
    if (data.status !== 'OK' || !data.routes?.length) {
      return { success: false, error: `Directions API status=${data.status}${data.error_message ? ` (${data.error_message})` : ''}` }
    }

    const firstRoute = data.routes[0]
    const firstLeg = firstRoute.legs?.[0]
    const durationSeconds = firstLeg?.duration?.value
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return { success: false, error: 'Directions API returned no duration' }
    }

    const oneWayHours = durationSeconds / 3600
    const hours = roundTrip ? oneWayHours * 2 : oneWayHours
    const travelTimeHours = Math.round(hours * 100) / 100

    _cache.set(key, {
      travelTimeHours,
      oneWayHours: Math.round(oneWayHours * 100) / 100,
      expiresAtMs: now + ttlSeconds * 1000,
    })

    return {
      success: true,
      travelTimeHours,
      oneWayHours: Math.round(oneWayHours * 100) / 100,
      roundTrip,
      source: 'directions',
    }
  } catch (e) {
    return { success: false, error: e?.message || 'Unknown error fetching transit duration' }
  }
}

