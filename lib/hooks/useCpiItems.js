'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Custom hook to fetch items/prices from Supabase
 * (backed by `public.singstat_data`)
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
          .from('singstat_data')
          .select('item_id, data_series, category_name, price_2026_jan, cpi_index')
          .order('data_series', { ascending: true })

        if (fetchError) {
          // PostgrestError usually has { message, details, hint, code }.
          const messageParts = [
            fetchError.message,
            fetchError.code ? `code=${fetchError.code}` : null,
            fetchError.details ? `details=${fetchError.details}` : null,
            fetchError.hint ? `hint=${fetchError.hint}` : null,
          ].filter(Boolean)
          const enriched = new Error(messageParts.join(' | ') || 'Failed to fetch CPI items')
          enriched.cause = fetchError
          throw enriched
        }

        // Normalize to the app's expected shape (historically from `cpi_cache`)
        const normalized = (data || []).map((row) => ({
          item_id: row.item_id,
          item_name: row.data_series,
          estimated_price:
            row.price_2026_jan == null ? 0 : Number(row.price_2026_jan),
          cpi_index: row.cpi_index == null ? null : Number(row.cpi_index),
          category: row.category_name || 'Other',
          // `data_month` no longer exists; keep undefined for compatibility.
        }))

        setItems(normalized)
        setError(null)
      } catch (err) {
        // Next dev overlay sometimes shows `{}` for non-Error objects; normalize.
        const normalizedMessage =
          err instanceof Error
            ? err.message
            : (typeof err === 'string' ? err : JSON.stringify(err))

        console.error('Error fetching CPI items:', {
          message: normalizedMessage,
          err,
        })
        setError(normalizedMessage || 'Unknown error fetching CPI items')
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [])

  return { items, loading, error }
}
