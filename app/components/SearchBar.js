'use client'

// SearchBar - Fuzzy search component for grocery items using Fuse.js
import { useState, useMemo } from 'react'
import Fuse from 'fuse.js'
import { useCpiItems } from '@/lib/hooks/useCpiItems'
import { Search } from 'lucide-react'
import styles from './SearchBar.module.css'

export default function SearchBar({ onItemSelect }) {
  const [searchQuery, setSearchQuery] = useState('')
  const { items, loading, error } = useCpiItems()

  const fuseOptions = {
    keys: [
      { name: 'item_name', weight: 0.7 },
      { name: 'category', weight: 0.3 },
    ],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 1,
  }

  const fuse = useMemo(() => {
    if (!items || items.length === 0) return null
    return new Fuse(items, fuseOptions)
  }, [items])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !fuse) {
      return []
    }

    const results = fuse.search(searchQuery)
    return results.map((result) => result.item).slice(0, 10)
  }, [searchQuery, fuse])

  const handleItemClick = (item) => {
    if (onItemSelect) {
      onItemSelect(item)
    }
    setSearchQuery('')
  }

  if (error) {
    return (
      <div className={styles.errorMessage}>
        Error loading items: {error}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.searchWrapper}>
        <Search className={styles.searchIcon} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={loading ? 'Loading items...' : 'Search for groceries (e.g., Milk, Bread, Rice)'}
          className={styles.searchInput}
          disabled={loading}
        />
      </div>

      {searchQuery.trim() && searchResults.length > 0 && (
        <div className={styles.resultsDropdown}>
          {searchResults.map((item) => (
            <button
              key={item.item_id}
              onClick={() => handleItemClick(item)}
              className={styles.resultItem}
            >
              <div className={styles.resultContent}>
                <div className={styles.resultInfo}>
                  <div className={styles.resultName}>{item.item_name}</div>
                  <div className={styles.resultCategory}>{item.category}</div>
                </div>
                <div className={styles.resultPrice}>
                  <div className={styles.resultPriceValue}>
                    ${item.estimated_price?.toFixed(2) || '0.00'}
                  </div>
                  <div className={styles.resultPriceUnit}>per unit</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {searchQuery.trim() && searchResults.length === 0 && !loading && (
        <div className={styles.noResults}>
          No items found matching "{searchQuery}"
        </div>
      )}
    </div>
  )
}
