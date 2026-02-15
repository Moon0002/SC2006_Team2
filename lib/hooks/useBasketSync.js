'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBasketStore } from '@/lib/stores/basketStore'
import { useAuth } from './useAuth'

/**
 * Custom hook to sync basket state to Supabase profiles.saved_basket
 * Automatically saves basket changes with debouncing (2 seconds)
 * Only syncs when user is authenticated
 */
export function useBasketSync() {
  const { user } = useAuth()
  const supabase = createClient()
  const items = useBasketStore((state) => state.items)
  const debounceTimerRef = useRef(null)
  const lastSyncedItemsRef = useRef(null)

  useEffect(() => {
    // Only sync if user is authenticated
    if (!user) {
      return
    }

    // Skip if items haven't changed
    const itemsString = JSON.stringify(items)
    if (itemsString === lastSyncedItemsRef.current) {
      return
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new debounced save
    debounceTimerRef.current = setTimeout(async () => {
      try {
        // Prepare basket data for storage (only essential fields)
        const basketData = items.map((item) => ({
          item_id: item.item_id,
          item_name: item.item_name,
          quantity: item.quantity,
          estimated_price: item.estimated_price,
          category: item.category,
        }))

        // Update saved_basket in profiles table
        const { error } = await supabase
          .from('profiles')
          .update({
            saved_basket: basketData,
          })
          .eq('id', user.id)

        if (error) {
          console.error('Error saving basket to Supabase:', error)
        } else {
          // Mark as synced
          lastSyncedItemsRef.current = itemsString
          console.log('Basket saved to Supabase successfully')
        }
      } catch (error) {
        console.error('Error in basket sync:', error)
      }
    }, 2000) // 2 second debounce

    // Cleanup timer on unmount or items change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [items, user, supabase])
}
