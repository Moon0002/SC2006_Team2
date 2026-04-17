'use client'

// Login/Signup page - Email/password authentication with Supabase
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/persistence/supabase/client'
import { LogIn, Loader2, Mail, Lock, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [next, setNext] = useState('/')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setNext(params.get('next') || '/')
    }
  }, [])

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setMessage(null)

      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        })

        if (signUpError) {
          throw signUpError
        }

        setMessage('Check your email to confirm your account!')
        setEmail('')
        setPassword('')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          throw signInError
        }

        router.push(next)
        router.refresh()
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError(err.message || `Failed to ${isSignUp ? 'sign up' : 'sign in'}`)
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>PriceWatch</h1>
          <p className={styles.subtitle}>
            {isSignUp ? 'Create an account to save your preferences' : 'Sign in to save your preferences'}
          </p>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        {message && (
          <div className={styles.successMessage}>
            <p className={styles.successText}>{message}</p>
          </div>
        )}

        <form onSubmit={handleEmailAuth} className={styles.form}>
          <div className={styles.formGroup}>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                Email
              </label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
                  required
                  minLength={6}
                  className={styles.input}
                />
              </div>
              {isSignUp && (
                <p className={styles.inputHint}>Password must be at least 6 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isSignUp ? 'Creating account...' : 'Signing in...'}</span>
                </>
              ) : (
                <>
                  {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className={styles.toggleSection}>
          {isSignUp ? (
            <p className={styles.toggleText}>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setIsSignUp(false)
                  setError(null)
                  setMessage(null)
                }}
                className={styles.toggleButton}
              >
                Sign in
              </button>
            </p>
          ) : (
            <p className={styles.toggleText}>
              Don't have an account?{' '}
              <button
                onClick={() => {
                  setIsSignUp(true)
                  setError(null)
                  setMessage(null)
                }}
                className={styles.toggleButton}
              >
                Sign up
              </button>
            </p>
          )}
        </div>

        <div className={styles.footer}>
          <Link
            href="/"
            className={styles.footerLink}
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
