'use client'

// ROI Calculator page - Calculates true cost of grocery trips including transit fare and time value
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/persistence/supabase/client'
import TopStoresROI from '@/components/TopStoresROI'
import ROIMapVisualizer from '@/components/ROIMapVisualizer'
import { useBasketStore } from '@/stores/basketStore'
import { useBasketSync } from '@/hooks/useBasketSync'
import { useBasketRestore } from '@/hooks/useBasketRestore'
import { useAuth } from '@/hooks/useAuth'
import { MapPin, ShoppingCart, User, Settings, LogOut, X } from 'lucide-react'
import styles from './page.module.css'

export default function ROIPage() {
  const [originPostalCode, setOriginPostalCode] = useState('')
  const [hourlyRate, setHourlyRate] = useState(10)
  const [isMounted, setIsMounted] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { items: basketItems, getTotalItems } = useBasketStore()
  const { user, signOut } = useAuth()
  const supabase = createClient()
  const menuRef = useRef(null)
  const profileLoadedRef = useRef(false)
  
  useBasketSync()
  useBasketRestore()

  useEffect(() => {
    if (!user) {
      profileLoadedRef.current = false
      return
    }

    async function fetchProfileDefaults() {
      if (profileLoadedRef.current) {
        return
      }

      profileLoadedRef.current = true

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('home_postal, hourly_rate')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
          return
        }

        if (data) {
          if (data.home_postal) {
            setOriginPostalCode(data.home_postal)
          }
          if (data.hourly_rate) {
            setHourlyRate(data.hourly_rate)
          }
        }
      } catch (err) {
        console.error('Error loading profile defaults:', err)
      }
    }

    fetchProfileDefaults()
  }, [user, supabase])

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  const basketItemCount = isMounted ? getTotalItems() : 0

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerInner}>
            <div className={styles.headerLeft}>
              <Link href="/" className={styles.logo}>
                PriceWatch
              </Link>
              <span className={styles.headerTitle}>- ROI Calculator</span>
            </div>
            <div className={styles.userMenu} ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={styles.userButton}
                aria-label="User menu"
              >
                {user ? (
                  <div className={styles.userAvatar}>
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                ) : (
                  <User className={styles.userIcon} />
                )}
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div className={styles.userDropdown}>
                  {user ? (
                    <>
                      <div className={styles.userInfo}>
                        <p className={styles.userInfoTitle}>Account</p>
                        <p className={styles.userEmail}>{user.email}</p>
                        <p className={styles.userId}>ID: {user.id.slice(0, 8)}...</p>
                      </div>
                      <Link
                        href="/settings"
                        onClick={() => setShowUserMenu(false)}
                        className={styles.dropdownLink}
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      <button
                        onClick={async () => {
                          await signOut()
                          setShowUserMenu(false)
                        }}
                        className={styles.dropdownButton}
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/auth/login?next=/roi"
                      onClick={() => setShowUserMenu(false)}
                      className={styles.dropdownLink}
                    >
                      <User className="w-4 h-4" />
                      Sign In
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.instructions}>
          <h2 className={styles.instructionsTitle}>How to Find Best Stores</h2>
          <ol className={styles.instructionsList}>
            <li>Add items to your basket (go to <a href="/basket" className="underline font-medium">Basket page</a>)</li>
            <li>Enter your origin postal code (where you're starting from)</li>
            <li>Adjust your hourly rate using the slider</li>
            <li>Click "Find Top 3 Stores" to see stores ranked by review count with ROI calculations</li>
          </ol>
        </div>

        {basketItemCount === 0 ? (
          <div className={`${styles.basketStatus} ${styles.basketStatusEmpty}`}>
            <p className={styles.basketStatusText}>
              Your basket is empty. <a href="/basket" className="underline font-medium">Add items to your basket</a> first to calculate ROI.
            </p>
          </div>
        ) : (
          <div className={`${styles.basketStatus} ${styles.basketStatusFull}`}>
            <p className={styles.basketStatusTextFull}>
              You have <strong>{basketItemCount} items</strong> in your basket. Ready to calculate ROI!
            </p>
          </div>
        )}

        <div className={styles.postalCodeSection}>
          <div>
            <label className={styles.postalCodeLabel}>
              <MapPin className="w-4 h-4 inline mr-1" />
              Your Location (Postal Code)
            </label>
            <input
              type="text"
              value={originPostalCode}
              onChange={(e) => setOriginPostalCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="639798"
              maxLength={6}
              className={styles.postalCodeInput}
              suppressHydrationWarning
            />
            <p className={styles.postalCodeHint}>6-digit Singapore postal code - We'll find the top 3 stores near you ranked by review count</p>
          </div>
        </div>

        <div className={styles.calculatorSection}>
          <TopStoresROI
            originPostalCode={originPostalCode}
            hourlyRate={hourlyRate}
            onHourlyRateChange={setHourlyRate}
          />
        </div>

        <div className={styles.mapSection}>
          <div className={styles.mapContainer}>
            <h2 className={styles.mapTitle}>Store ROI Map</h2>
            <p className={styles.mapDescription}>
              View all stores with calculated ROI labels. Green markers indicate positive ROI, red markers indicate negative ROI.
            </p>
            <ROIMapVisualizer
              originPostalCode={originPostalCode}
              hourlyRate={hourlyRate}
            />
          </div>
        </div>

        <div className={styles.quickLinks}>
          <a
            href="/basket"
            className={styles.quickLink}
          >
            Back to Basket
          </a>
        </div>
      </main>
    </div>
  )
}
