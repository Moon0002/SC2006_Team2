/**
 * Singapore Supermarket Locations Dataset
 * Contains major supermarket chains with postal codes and coordinates
 */

export const SUPERMARKETS = [
  // FairPrice locations
  {
    id: 'ntuc-1',
    name: 'FairPrice Xtra',
    chain: 'FairPrice',
    address: '50 Jurong Gateway Road, #01-01',
    postalCode: '608549',
    lat: 1.3328,
    lng: 103.7434,
    category: 'hypermarket',
  },
  {
    id: 'ntuc-2',
    name: 'FairPrice',
    chain: 'FairPrice',
    address: '1 Jurong West Central 2, #B1-01',
    postalCode: '648886',
    lat: 1.3396,
    lng: 103.7058,
    category: 'supermarket',
  },
  {
    id: 'ntuc-3',
    name: 'FairPrice Xtra',
    chain: 'FairPrice',
    address: '930 Yishun Avenue 2, #02-01',
    postalCode: '769098',
    lat: 1.4294,
    lng: 103.8358,
    category: 'hypermarket',
  },
  {
    id: 'ntuc-4',
    name: 'FairPrice',
    chain: 'FairPrice',
    address: '1 Tampines Walk, #B1-01',
    postalCode: '528523',
    lat: 1.3526,
    lng: 103.9444,
    category: 'supermarket',
  },
  {
    id: 'ntuc-5',
    name: 'FairPrice',
    chain: 'FairPrice',
    address: '83 Punggol Central, #B1-01',
    postalCode: '828761',
    lat: 1.4047,
    lng: 103.9028,
    category: 'supermarket',
  },

  // Sheng Siong locations
  {
    id: 'sheng-1',
    name: 'Sheng Siong',
    chain: 'Sheng Siong',
    address: '6 Choa Chu Kang Central, #01-01',
    postalCode: '689812',
    lat: 1.3847,
    lng: 103.7453,
    category: 'supermarket',
  },
  {
    id: 'sheng-2',
    name: 'Sheng Siong',
    chain: 'Sheng Siong',
    address: '50 Jurong Gateway Road, #B1-01',
    postalCode: '608549',
    lat: 1.3328,
    lng: 103.7434,
    category: 'supermarket',
  },
  {
    id: 'sheng-3',
    name: 'Sheng Siong',
    chain: 'Sheng Siong',
    address: '930 Yishun Avenue 2, #B1-01',
    postalCode: '769098',
    lat: 1.4294,
    lng: 103.8358,
    category: 'supermarket',
  },
  {
    id: 'sheng-4',
    name: 'Sheng Siong',
    chain: 'Sheng Siong',
    address: '83 Punggol Central, #B1-01',
    postalCode: '828761',
    lat: 1.4047,
    lng: 103.9028,
    category: 'supermarket',
  },
  {
    id: 'sheng-5',
    name: 'Sheng Siong',
    chain: 'Sheng Siong',
    address: '1 Tampines Walk, #B1-02',
    postalCode: '528523',
    lat: 1.3526,
    lng: 103.9444,
    category: 'supermarket',
  },

  // Cold Storage locations
  {
    id: 'cold-1',
    name: 'Cold Storage',
    chain: 'Cold Storage',
    address: '50 Jurong Gateway Road, #02-01',
    postalCode: '608549',
    lat: 1.3328,
    lng: 103.7434,
    category: 'supermarket',
  },
  {
    id: 'cold-2',
    name: 'Cold Storage',
    chain: 'Cold Storage',
    address: '1 Jurong West Central 2, #B1-02',
    postalCode: '648886',
    lat: 1.3396,
    lng: 103.7058,
    category: 'supermarket',
  },
  {
    id: 'cold-3',
    name: 'Cold Storage',
    chain: 'Cold Storage',
    address: '930 Yishun Avenue 2, #02-02',
    postalCode: '769098',
    lat: 1.4294,
    lng: 103.8358,
    category: 'supermarket',
  },
  {
    id: 'cold-4',
    name: 'Cold Storage',
    chain: 'Cold Storage',
    address: '1 Tampines Walk, #B1-03',
    postalCode: '528523',
    lat: 1.3526,
    lng: 103.9444,
    category: 'supermarket',
  },

  // Giant locations
  {
    id: 'giant-1',
    name: 'Giant',
    chain: 'Giant',
    address: '50 Jurong Gateway Road, #03-01',
    postalCode: '608549',
    lat: 1.3328,
    lng: 103.7434,
    category: 'hypermarket',
  },
  {
    id: 'giant-2',
    name: 'Giant',
    chain: 'Giant',
    address: '1 Jurong West Central 2, #B1-03',
    postalCode: '648886',
    lat: 1.3396,
    lng: 103.7058,
    category: 'hypermarket',
  },
  {
    id: 'giant-3',
    name: 'Giant',
    chain: 'Giant',
    address: '83 Punggol Central, #B1-02',
    postalCode: '828761',
    lat: 1.4047,
    lng: 103.9028,
    category: 'hypermarket',
  },
]

/**
 * Get supermarkets by chain
 */
export function getSupermarketsByChain(chain) {
  return SUPERMARKETS.filter((store) => store.chain === chain)
}

/**
 * Get supermarket by ID
 */
export function getSupermarketById(id) {
  return SUPERMARKETS.find((store) => store.id === id)
}

/**
 * Get supermarkets near a location (within radius in km)
 */
export function getSupermarketsNearLocation(lat, lng, radiusKm = 5) {
  return SUPERMARKETS.filter((store) => {
    const distance = calculateDistance(lat, lng, store.lat, store.lng)
    return distance <= radiusKm * 1000 // Convert km to meters
  })
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return distance
}
