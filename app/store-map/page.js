'use client'

import SimpleMap from '@/components/SimpleMap'
import { useBasketStore } from '@/stores/basketStore'
import { ShoppingCart } from 'lucide-react'

/**
 * Store ROI Map Page
 * Visualizes all stores with ROI calculations on an interactive map
 */
export default function StoreMapPage() {
  const { getTotalItems } = useBasketStore()
  const basketItemCount = getTotalItems()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Store ROI Map - PriceWatch
            </h1>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                <ShoppingCart className="w-5 h-5 inline mr-1" />
                {basketItemCount} items in basket
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Instructions */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Store Map
          </h2>
          <p className="text-sm text-blue-800">
            View Singapore map with store locations.
          </p>
        </div>

        {/* Basket Status */}
        {basketItemCount === 0 ? (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
               Your basket is empty. <a href="/basket" className="underline font-medium">Add items to your basket</a> first to calculate store ROIs.
            </p>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">
              You have <strong>{basketItemCount} items</strong> in your basket. Ready to calculate store ROIs!
            </p>
          </div>
        )}


        {/* Simple Map */}
        <div className="mb-6">
          <SimpleMap
            center={{ lat: 1.3521, lng: 103.8198 }}
            zoom={11}
            height="600px"
          />
        </div>

        {/* Quick Links */}
        <div className="mt-8 flex gap-4 justify-center">
          <a
            href="/basket"
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors"
          >
            Back to Basket
          </a>
          <a
            href="/roi"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Single Store ROI Calculator
          </a>
        </div>
      </main>
    </div>
  )
}
