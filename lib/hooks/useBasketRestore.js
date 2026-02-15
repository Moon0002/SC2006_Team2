'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBasketStore } from '@/lib/stores/basketStore'
import { useAuth } from './useAuth'

/**
 * Custom hook to restore basket from Supabase on login
 * Handles merging guest basket with saved basket
 */
export function useBasketRestore() {
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const { items: currentItems, clearBasket, addItem } = useBasketStore()
  const hasRestoredRef = useRef(false)

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return
    }

    // Only restore once per login session
    if (hasRestoredRef.current) {
      return
    }

    // Only restore if user is authenticated
    if (!user) {
      hasRestoredRef.current = false // Reset when logged out
      return
    }

    // Restore basket from Supabase
    const restoreBasket = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('saved_basket')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching saved basket:', error)
          return
        }

        const savedBasket = profile?.saved_basket || []

        // If there's no saved basket, nothing to restore
        if (!savedBasket || savedBasket.length === 0) {
          hasRestoredRef.current = true
          return
        }

        // If current basket is empty, just restore the saved basket
        if (currentItems.length === 0) {
          // Restore items one by one
          savedBasket.forEach((item) => {
            addItem(item, item.quantity || 1)
          })
          hasRestoredRef.current = true
          console.log('Basket restored from Supabase')
          return
        }

        // If both baskets have items, merge them
        // Strategy: Keep current items, add missing items from saved basket
        const currentItemIds = new Set(currentItems.map((item) => item.item_id))
        const newItems = savedBasket.filter(
          (item) => !currentItemIds.has(item.item_id)
        )

        // Add new items from saved basket
        newItems.forEach((item) => {
          addItem(item, item.quantity || 1)
        })

        hasRestoredRef.current = true
        console.log('Basket merged with saved basket from Supabase')
      } catch (error) {
        console.error('Error restoring basket:', error)
      }
    }

    restoreBasket()
  }, [user, authLoading, supabase, currentItems, addItem])
}
