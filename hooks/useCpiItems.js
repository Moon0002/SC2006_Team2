'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/persistence/supabase/client'

/**
 * Fetches items/prices from Supabase (`public.singstat_data`).
 * On failure, `error` is set to a readable message for the UI.
 */
export function useCpiItems() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchItems() {
      try {
        setLoading(true)
        setError(null)
        const supabase = createClient()

        const { data, error: fetchError } = await supabase
          .from('singstat_data')
          .select('item_id, data_series, category_name, price_2026_jan, cpi_index')
          .order('data_series', { ascending: true })

        if (fetchError) {
          const messageParts = [
            fetchError.message,
            fetchError.code ? `code=${fetchError.code}` : null,
            fetchError.details ? `details=${fetchError.details}` : null,
            fetchError.hint ? `hint=${fetchError.hint}` : null,
          ].filter(Boolean)
          throw new Error(messageParts.join(' | ') || 'Failed to fetch items')
        }

        const normalized = (data || []).map((row) => ({
          item_id: row.item_id,
          item_name: row.data_series,
          estimated_price:
            row.price_2026_jan == null ? 0 : Number(row.price_2026_jan),
          cpi_index: row.cpi_index == null ? null : Number(row.cpi_index),
          category: row.category_name || 'Other',
        }))

        setItems(normalized)
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
              ? err
              : 'Unknown error loading items'

        console.error('Error fetching CPI items:', err)
        setError(message)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [])

  return { items, loading, error }
}
