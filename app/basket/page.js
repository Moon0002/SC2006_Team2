'use client'

// Basket page - Main interface for searching and adding grocery items to basket
import SearchBar from '@/components/SearchBar'
import ItemCard from '@/components/ItemCard'
import BasketInline from '@/components/BasketInline'
import { useBasketStore } from '@/stores/basketStore'
import { useAuth } from '@/hooks/useAuth'
import { useBasketSync } from '@/hooks/useBasketSync'
import { useBasketRestore } from '@/hooks/useBasketRestore'
import { ShoppingCart, User, Settings } from 'lucide-react'
import Link from 'next/link'
import styles from './page.module.css'

export default function BasketPage() {
  const { getTotalItems } = useBasketStore()
  const { user } = useAuth()
  
  useBasketSync()
  useBasketRestore()

  const handleItemSelect = (item) => {
    const { addItem } = useBasketStore.getState()
    addItem(item, 1)
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerInner}>
            <Link href="/" className={styles.logo}>
              PriceWatch
            </Link>
            <div className={styles.headerActions}>
              {user ? (
                <Link
                  href="/settings"
                  className={styles.settingsLink}
                  aria-label="Settings"
                >
                  <Settings className="w-6 h-6 text-gray-700" />
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className={styles.signInLink}
                  aria-label="Sign in"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden sm:inline">Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.mainContent}>
          <div className={styles.searchSection}>
            <h2 className={styles.searchTitle}>
              Search for Groceries
            </h2>
            <SearchBar onItemSelect={handleItemSelect} />
          </div>

          <div className={styles.instructions}>
            <p className={styles.instructionsText}>
              💡  <strong>Tip:</strong> Search for items like "Milk", "Bread", or "Rice". 
              Click on a result to add it to your basket, or use the search to find items quickly.
            </p>
          </div>

          <div className={styles.note}>
            <p>
              Item cards will appear here when you search for items. 
              You can also create a separate page to display all available items.
            </p>
          </div>

          <BasketInline />
        </div>
      </main>
    </div>
  )
}
