'use client'

// Home page - Landing page with navigation to basket and ROI calculator features
import Link from 'next/link'
import { useBasketStore } from '@/lib/stores/basketStore'
import { useAuth } from '@/lib/hooks/useAuth'
import { ShoppingCart, Calculator, Settings, User, MapPin, TrendingUp } from 'lucide-react'
import styles from './page.module.css'

export default function Home() {
  const { getTotalItems } = useBasketStore()
  const { user } = useAuth()
  const basketItemCount = getTotalItems()

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerInner}>
            <Link href="/" className={styles.logo}>
              EconoSG
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
                >
                  <User className="w-5 h-5" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.mainContent}>
          <div className={styles.welcomeSection}>
            <h2 className={styles.welcomeTitle}>
              Calculate the True Cost of Your Grocery Trip
            </h2>
            <p className={styles.welcomeDescription}>
              Find out if traveling to a cheaper supermarket is worth the transport cost and time.
              Compare prices, transit fares, and your time value to make informed decisions.
            </p>
          </div>

          <div className={styles.featureGrid}>
            <Link
              href="/basket"
              className={`${styles.featureCard} group`}
            >
              <div className={styles.featureCardContent}>
                <div className={styles.featureIcon}>
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
                <div className={styles.featureText}>
                  <h3 className={styles.featureTitle}>
                    Create Basket
                  </h3>
                  <p className={styles.featureDescription}>
                    Search and add grocery items to your basket. No login required to get started.
                  </p>
                  {basketItemCount > 0 && (
                    <div className={styles.basketCount}>
                      {basketItemCount} item{basketItemCount !== 1 ? 's' : ''} in basket
                    </div>
                  )}
                </div>
              </div>
            </Link>

            <Link
              href="/roi"
              className={`${styles.featureCard} group`}
            >
              <div className={styles.featureCardContent}>
                <div className={styles.featureIconGreen}>
                  <Calculator className="w-6 h-6 text-green-600" />
                </div>
                <div className={styles.featureText}>
                  <h3 className={styles.featureTitle}>
                    Calculate ROI
                  </h3>
                  <p className={styles.featureDescription}>
                    Find the best stores near you. See which trips save you money after accounting for transit and time costs.
                  </p>
                  {basketItemCount === 0 && (
                    <div className={styles.emptyBasket}>
                      Add items to basket first
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </div>

          <div className={styles.infoBox}>
            <div className={styles.infoBoxContent}>
              <TrendingUp className={styles.infoIcon} />
              <div className={styles.infoText}>
                <h3 className={styles.infoTitle}>How It Works</h3>
                <ol className={styles.infoList}>
                  <li>Add grocery items to your basket</li>
                  <li>Enter your starting location (postal code)</li>
                  <li>View the top 3 stores ranked by reviews with ROI calculations</li>
                  <li>See if the trip is worth it after transit costs and time value</li>
                </ol>
              </div>
            </div>
          </div>

          {user && (
            <div className={styles.accountSection}>
              <div className={styles.accountContent}>
                <div className={styles.accountInfo}>
                  <h3 className={styles.accountTitle}>
                    Welcome back, {user.email?.split('@')[0] || 'User'}!
                  </h3>
                  <p className={styles.accountDescription}>
                    Your basket is automatically saved when you're logged in.
                  </p>
                </div>
                <Link
                  href="/settings"
                  className={styles.accountButton}
                >
                  Settings
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
