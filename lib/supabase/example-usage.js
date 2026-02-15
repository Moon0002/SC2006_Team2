/**
 * Example usage of Supabase clients
 * This file demonstrates how to use the different client utilities
 */

// ============================================
// CLIENT COMPONENT EXAMPLE
// ============================================
/*
'use client'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function ClientExample() {
  const [items, setItems] = useState([])
  const supabase = createClient()

  useEffect(() => {
    async function fetchItems() {
      const { data, error } = await supabase
        .from('cpi_cache')
        .select('*')
        .limit(10)
      
      if (error) {
        console.error('Error fetching items:', error)
      } else {
        setItems(data || [])
      }
    }
    fetchItems()
  }, [])

  return (
    <div>
      <h2>Items ({items.length})</h2>
      <ul>
        {items.map(item => (
          <li key={item.item_name}>{item.item_name}</li>
        ))}
      </ul>
    </div>
  )
}
*/

// ============================================
// SERVER COMPONENT EXAMPLE
// ============================================
/*
import { createClient } from '@/lib/supabase/server'

export default async function ServerExample() {
  const supabase = await createClient()
  
  const { data: items, error } = await supabase
    .from('cpi_cache')
    .select('*')
    .limit(10)

  if (error) {
    return <div>Error: {error.message}</div>
  }

  return (
    <div>
      <h2>Items ({items?.length || 0})</h2>
      <ul>
        {items?.map(item => (
          <li key={item.item_name}>{item.item_name}</li>
        ))}
      </ul>
    </div>
  )
}
*/

// ============================================
// SERVER ACTION EXAMPLE
// ============================================
/*
'use server'
import { createClient } from '@/lib/supabase/server'

export async function saveBasket(basketData) {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('Not authenticated')
  }

  // Update user's saved basket
  const { error } = await supabase
    .from('profiles')
    .update({ saved_basket: basketData })
    .eq('id', user.id)

  if (error) {
    throw new Error(`Failed to save basket: ${error.message}`)
  }

  return { success: true }
}
*/

// ============================================
// ADMIN CLIENT EXAMPLE (Server Action/API Route)
// ============================================
/*
'use server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function updateCpiCache(cpiData) {
  const supabase = createAdminClient()
  
  // Admin operations bypass RLS
  const { error } = await supabase
    .from('cpi_cache')
    .upsert(cpiData, { onConflict: 'item_name' })

  if (error) {
    throw new Error(`Failed to update CPI cache: ${error.message}`)
  }

  return { success: true }
}
*/
