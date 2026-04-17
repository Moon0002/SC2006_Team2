'use client'

// Settings page - User profile management for home postal code and hourly rate preferences
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/persistence/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Save, Loader2, MapPin, DollarSign, LogOut } from 'lucide-react'
import styles from './page.module.css'
import { isValidPostalCode, isValidHourlyRate } from '@/lib/utils/validation'
import {
  isLikelySupabaseUnavailableError,
  SUPABASE_SAVE_UNAVAILABLE_MESSAGE,
} from '@/lib/persistence/supabase/errors'

const POSTAL_CODE_ERROR = 'Please enter a valid 6-digit postal code.'

function profileSaveErrorMessage(err) {
  if (isLikelySupabaseUnavailableError(err)) {
    return SUPABASE_SAVE_UNAVAILABLE_MESSAGE
  }
  const raw = typeof err?.message === 'string' ? err.message : ''
  if (raw.includes('postal_code_format')) {
    return POSTAL_CODE_ERROR
  }
  return raw || 'Failed to save settings'
}

export default function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [homePostal, setHomePostal] = useState('')
  const [hourlyRateInput, setHourlyRateInput] = useState('10')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('home_postal, hourly_rate')
          .eq('id', user.id)
          .single()

        if (fetchError) {
          throw fetchError
        }

        if (data) {
          setHomePostal(data.home_postal || '')
          setHourlyRateInput(String(data.hourly_rate ?? 10))
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchProfile()
    } else {
      setLoading(false)
    }
  }, [user, supabase])

  const handleSave = async (e) => {
    e.preventDefault()
    
    if (!user) {
      router.push('/auth/login?next=/settings')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const parsedHourlyRate = parseFloat(hourlyRateInput)
      if (!isValidHourlyRate(parsedHourlyRate)) {
        setError('Please enter a valid hourly rate (0 or greater).')
        setSaving(false)
        return
      }

      const postalDigits = homePostal.replace(/\D/g, '')
      if (postalDigits.length > 0 && !isValidPostalCode(postalDigits)) {
        setError(POSTAL_CODE_ERROR)
        setSaving(false)
        return
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          home_postal: postalDigits.length === 6 ? postalDigits : null,
          hourly_rate: parsedHourlyRate,
        })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(profileSaveErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?next=/settings')
    }
  }, [user, authLoading, router])

  if (authLoading || loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.loadingSpinner} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.loadingSpinner} />
      </div>
    )
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
            <button
              onClick={signOut}
              className={styles.signOutButton}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Profile Settings</h2>

          {error && (
            <div className={styles.errorMessage}>
              <p className={styles.errorText}>{error}</p>
            </div>
          )}

          {success && (
            <div className={styles.successMessage}>
              <p className={styles.successText}>Settings saved successfully!</p>
            </div>
          )}

          <form onSubmit={handleSave} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <MapPin className="w-4 h-4 inline mr-1" />
                Default Home Postal Code
              </label>
              <input
                type="text"
                value={homePostal}
                onChange={(e) => setHomePostal(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="639798"
                maxLength={6}
                className={styles.formInput}
              />
              <p className={styles.formHint}>
                6-digit Singapore postal code (optional)
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <DollarSign className="w-4 h-4 inline mr-1" />
                Default Hourly Rate (SGD)
              </label>
              <input
                type="number"
                value={hourlyRateInput}
                onChange={(e) => setHourlyRateInput(e.target.value)}
                min="0"
                max="1000"
                step="0.5"
                className={styles.formInput}
              />
              <p className={styles.formHint}>
                Used to calculate opportunity cost of travel time (default: $10/hr)
              </p>
            </div>

            <div className={styles.formActions}>
              <button
                type="submit"
                disabled={saving}
                className={styles.saveButton}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className={styles.userInfoCard}>
          <h3 className={styles.userInfoTitle}>Account Information</h3>
          <div className={styles.userInfoContent}>
            <div className={styles.userInfoRow}>
              <span className={styles.userInfoLabel}>Email:</span>
              <span className={styles.userInfoValue}>{user?.email}</span>
            </div>
            <div className={styles.userInfoRow}>
              <span className={styles.userInfoLabel}>User ID:</span>
              <span className={styles.userInfoValueMono}>{user?.id}</span>
            </div>
          </div>
        </div>

        <div className={styles.quickLinks}>
          <a
            href="/basket"
            className={styles.quickLink}
          >
            Back to Basket
          </a>
          <a
            href="/roi"
            className={styles.quickLink}
          >
            ROI Calculator
          </a>
        </div>
      </main>
    </div>
  )
}
