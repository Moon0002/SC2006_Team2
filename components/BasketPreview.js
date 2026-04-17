'use client'

import { useBasketStore } from '@/stores/basketStore'
import { X, Plus, Minus, Trash2, ShoppingCart } from 'lucide-react'

/**
 * BasketPreview component - shows current basket items and summary
 * Can be used as a sidebar or modal
 */
export default function BasketPreview({ isOpen, onClose }) {
  const { items, removeItem, updateQuantity, clearBasket, getTotalItems, getTotalPrice } = useBasketStore()

  const totalItems = getTotalItems()
  const totalPrice = getTotalPrice()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900">
              Basket ({totalItems})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Close basket"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <ShoppingCart className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">Your basket is empty</p>
              <p className="text-sm mt-2">Add items to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.item_id}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.item_name}</h3>
                      <p className="text-xs text-gray-500">{item.category}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.item_id)}
                      className="p-1 hover:bg-red-100 rounded text-red-600 transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.item_id, item.quantity - 1)}
                        className="p-1 rounded bg-white border border-gray-300 hover:bg-gray-50 text-gray-700"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-semibold text-gray-900 min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.item_id, item.quantity + 1)}
                        className="p-1 rounded bg-white border border-gray-300 hover:bg-gray-50 text-gray-700"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        ${(item.estimated_price * item.quantity).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">
                        ${item.estimated_price.toFixed(2)} each
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Summary */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-700 font-medium">Total Items:</span>
              <span className="font-semibold text-gray-900">{totalItems}</span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold text-gray-900">Estimated Total:</span>
              <span className="text-2xl font-bold text-blue-600">
                ${totalPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearBasket}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 transition-colors"
              >
                Clear Basket
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
