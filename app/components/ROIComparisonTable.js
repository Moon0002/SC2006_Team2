'use client'

// ROIComparisonTable - Displays comparison table showing basket value, transit fare, time cost, and net ROI
import { TrendingUp, TrendingDown, DollarSign, Clock, MapPin } from 'lucide-react'

export default function ROIComparisonTable({ roiData, hourlyRate = 10, storeName = null }) {
  if (!roiData) {
    return (
      <div className="p-4 text-center text-gray-500">
        No ROI data available. Calculate a trip to see results.
      </div>
    )
  }

  const {
    netROI,
    totalGrossSavings,
    transitFare,
    opportunityCost,
    targetBasketValue,
    savingsPercentage,
    isWorthIt,
    travelTimeHours,
  } = roiData

  const formatCurrency = (value) => `$${Math.abs(value).toFixed(2)}`
  
  const formatTime = (hours) => {
    const totalMinutes = Math.round(hours * 60)
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    if (h > 0) {
      return `${h}h ${m}m`
    }
    return `${m}m`
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <h2 className="text-xl font-bold">
            {storeName ? `${storeName} - ROI Analysis` : 'Trip ROI Analysis'}
          </h2>
          <p className="text-sm text-blue-100 mt-1">
            Compare your options
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Metric
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                  Selected Market
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    Basket Value
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                    +{formatCurrency(targetBasketValue)}
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    Transit Fare
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                    -{formatCurrency(transitFare)}
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    Time Cost
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-center">
                  <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                    -{formatCurrency(opportunityCost)}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    ({formatTime(travelTimeHours)} @ ${hourlyRate}/hr)
                  </div>
                </td>
              </tr>

              <tr className="bg-gray-100 border-t-2 border-gray-300">
                <td className="px-4 py-4 text-sm font-bold text-gray-900">
                  Net ROI (True Cost)
                </td>
                <td className="px-4 py-4 text-sm text-center">
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-lg ${
                      isWorthIt
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {isWorthIt ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                    {netROI >= 0 ? '+' : ''}{formatCurrency(netROI)}
                  </span>
                  <div
                    className={`text-xs mt-1 font-medium ${
                      isWorthIt ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {isWorthIt ? '✓ Worth it!' : '✗ Not worth it'}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Items:</span>{' '}
              <span className="font-semibold">{roiData.itemCount || 0}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Quantity:</span>{' '}
              <span className="font-semibold">{roiData.totalQuantity || 0}</span>
            </div>
            {roiData.transitData && (
              <div>
                <span className="text-gray-600">Distance:</span>{' '}
                <span className="font-semibold">
                  {roiData.transitData.distanceKm?.toFixed(1)} km
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
