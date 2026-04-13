'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { normalizeBasketItemQuantity } from '@/lib/validation'

/**
 * Basket item structure
 * @typedef {Object} BasketItem
 * @property {string} item_id - Unique item identifier
 * @property {string} item_name - Display name of the item
 * @property {number} quantity - Quantity selected
 * @property {number} estimated_price - Price per unit in SGD
 * @property {number} cpi_index - CPI index value
 * @property {string} category - Item category
 */

/**
 * Basket store state and actions
 * @typedef {Object} BasketStore
 * @property {BasketItem[]} items - Array of items in the basket
 * @property {function} addItem - Add an item to the basket or increment quantity
 * @property {function} removeItem - Remove an item from the basket
 * @property {function} updateQuantity - Update the quantity of an item
 * @property {function} clearBasket - Clear all items from the basket
 * @property {function} getTotalItems - Get total number of items (sum of quantities)
 * @property {function} getTotalPrice - Get total estimated price of all items
 */

/**
 * Zustand store for managing grocery basket state
 * Uses persist middleware to save to localStorage for frictionless experience
 */
export const useBasketStore = create(
  persist(
    (set, get) => ({
      // State
      items: [],

      // Actions
      /**
       * Add an item to the basket or increment its quantity if it already exists
       * @param {BasketItem} item - Item to add (without quantity, defaults to 1)
       * @param {number} quantity - Quantity to add (default: 1)
       */
      addItem: (item, quantity = 1) => {
        const q = normalizeBasketItemQuantity(quantity)
        set((state) => {
          const existingItem = state.items.find(
            (i) => i.item_id === item.item_id
          )

          if (existingItem) {
            // Item already in basket, increment quantity
            return {
              items: state.items.map((i) =>
                i.item_id === item.item_id
                  ? { ...i, quantity: i.quantity + q }
                  : i
              ),
            }
          } else {
            // New item, add to basket
            return {
              items: [
                ...state.items,
                {
                  item_id: item.item_id,
                  item_name: item.item_name,
                  quantity: q,
                  estimated_price: item.estimated_price || 0,
                  cpi_index: item.cpi_index || 0,
                  category: item.category || 'Other',
                },
              ],
            }
          }
        })
      },

      /**
       * Remove an item completely from the basket
       * @param {string} itemId - ID of the item to remove
       */
      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.item_id !== itemId),
        }))
      },

      /**
       * Update the quantity of an item in the basket
       * @param {string} itemId - ID of the item to update
       * @param {number} quantity - New quantity (must be > 0, or item will be removed)
       */
      updateQuantity: (itemId, quantity) => {
        const q = Math.floor(Number(quantity))
        if (!Number.isFinite(q) || q < 1) {
          get().removeItem(itemId)
          return
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.item_id === itemId ? { ...item, quantity: q } : item
          ),
        }))
      },

      /**
       * Clear all items from the basket
       */
      clearBasket: () => {
        set({ items: [] })
      },

      /**
       * Get total number of items (sum of all quantities)
       * @returns {number} Total item count
       */
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },

      /**
       * Get total estimated price of all items in the basket
       * @returns {number} Total price in SGD
       */
      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.estimated_price * item.quantity,
          0
        )
      },
    }),
    {
      name: 'econosg-basket', // localStorage key
      version: 1, // Version for future migrations
    }
  )
)
