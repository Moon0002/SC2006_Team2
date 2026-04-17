/**
 * User-facing copy when Supabase / network is unreachable (save flows).
 */
export const SUPABASE_SAVE_UNAVAILABLE_MESSAGE =
  'Unable to save. Please try again later.'

/**
 * Best-effort detection of connectivity / service outage (not validation errors).
 */
export function isLikelySupabaseUnavailableError(err) {
  if (err == null) return false
  const msg = String(err.message ?? err.msg ?? err.toString?.() ?? '').toLowerCase()
  const name = String(err.name ?? '')
  const code = String(err.code ?? '')
  const status = err.status ?? err.statusCode

  if (name === 'AuthRetryableFetchError') return true
  if (status === 502 || status === 503 || status === 504) return true
  if (code === '502' || code === '503' || code === '504') return true

  if (msg.includes('failed to fetch')) return true
  if (msg.includes('networkerror')) return true
  if (msg.includes('load failed')) return true
  if (msg.includes('econnrefused')) return true
  if (msg.includes('enotfound')) return true
  if (msg.includes('etimedout') || msg.includes('timeout')) return true
  if (msg.includes('service unavailable')) return true
  if (msg.includes('bad gateway')) return true
  if (msg.includes('gateway timeout')) return true

  const cause = err.cause
  if (cause && isLikelySupabaseUnavailableError(cause)) return true

  return false
}
