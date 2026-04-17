'use client'

import { useState, useEffect } from 'react'
import { setMapsOptions, loadMapsAPI } from '@/lib/integrations/maps/loader'

/**
 * Debug page to check Google Maps API configuration
 */
export default function DebugMapsPage() {
  const [status, setStatus] = useState('Checking...')
  const [details, setDetails] = useState({})
  const [apiKeyVisible, setApiKeyVisible] = useState(false)

  useEffect(() => {
    async function checkConfig() {
      const checks = {
        hasEnvVar: false,
        envVarLength: 0,
        canSetOptions: false,
        canLoadAPI: false,
        error: null,
      }

      try {
        // Check if env var is accessible
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        checks.hasEnvVar = !!apiKey
        checks.envVarLength = apiKey ? apiKey.length : 0

        if (!apiKey) {
          setStatus('API Key Not Found')
          setDetails({
            ...checks,
            error: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set in .env file',
            solution: [
              '1. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here to .env file',
              '2. Restart the dev server (npm run dev)',
              '3. Refresh this page',
            ],
          })
          return
        }

        // Try to set options
        try {
          setMapsOptions()
          checks.canSetOptions = true
        } catch (err) {
          checks.canSetOptions = false
          checks.error = err.message
        }

        // Try to load API
        try {
          await loadMapsAPI(['maps'])
          checks.canLoadAPI = true
          setStatus('API Key Configured')
        } catch (err) {
          checks.canLoadAPI = false
          checks.error = err.message
          setStatus('API Loading Failed')
        }

        setDetails(checks)
      } catch (error) {
        setStatus('Error')
        setDetails({
          ...checks,
          error: error.message,
        })
      }
    }

    checkConfig()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Google Maps API Debug</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status: {status}</h2>

          <div className="space-y-4">
            <div>
              <strong>Environment Variable:</strong>{' '}
              {details.hasEnvVar ? (
                <span className="text-green-600">Found</span>
              ) : (
                <span className="text-red-600">Not Found</span>
              )}
              {details.envVarLength > 0 && (
                <span className="text-gray-500 ml-2">
                  (Length: {details.envVarLength})
                </span>
              )}
            </div>

            <div>
              <strong>Can Set Options:</strong>{' '}
              {details.canSetOptions ? (
                <span className="text-green-600">Yes</span>
              ) : (
                <span className="text-red-600">No</span>
              )}
            </div>

            <div>
              <strong>Can Load API:</strong>{' '}
              {details.canLoadAPI ? (
                <span className="text-green-600">Yes</span>
              ) : (
                <span className="text-red-600">No</span>
              )}
            </div>

            {details.error && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <strong className="text-red-800">Error:</strong>
                <p className="text-red-700 mt-2">{details.error}</p>
              </div>
            )}

            {details.solution && (
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <strong className="text-blue-800">Solution:</strong>
                <ul className="list-disc list-inside text-blue-700 mt-2 space-y-1">
                  {details.solution.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">API Key Check</h2>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={apiKeyVisible}
                  onChange={(e) => setApiKeyVisible(e.target.checked)}
                />
                Show API Key (for debugging)
              </label>
            </div>
            {apiKeyVisible && (
              <div className="bg-gray-100 p-3 rounded font-mono text-sm break-all">
                {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'Not set'}
              </div>
            )}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-yellow-800 mb-2">
            Important Notes:
          </h3>
          <ul className="list-disc list-inside text-yellow-700 space-y-1 text-sm">
            <li>
              Environment variables with <code>NEXT_PUBLIC_</code> prefix are
              exposed to the browser
            </li>
            <li>
              You must restart the dev server after changing .env file
            </li>
            <li>
              Make sure Geocoding API is enabled in Google Cloud Console
            </li>
            <li>
              Check API key restrictions in Google Cloud Console
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
