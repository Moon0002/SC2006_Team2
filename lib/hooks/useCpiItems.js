'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Custom hook to fetch CPI items from Supabase
 * @returns {Object} { items, loading, error }
 */
export function useCpiItems() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchItems() {
      try {
        setLoading(true)
        const supabase = createClient()
        
        const { data, error: fetchError } = await supabase
          .from('cpi_cache')
          .select('item_id, item_name, estimated_price, cpi_index, category, data_month')
          .order('item_name', { ascending: true })

        if (fetchError) {
          throw fetchError
        }

        setItems(data || [])
        setError(null)
      } catch (err) {
        console.error('Error fetching CPI items:', err)
        setError(err.message)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [])

  return { items, loading, error }
}
