/**
 * Shared validation for postal codes, hourly rates, and basket quantities.
 */

/** Singapore postal code: exactly 6 digits (0–9) */
export const POSTAL_CODE_REGEX = /^[0-9]{6}$/

export function isValidPostalCode(value) {
  if (value == null) return false
  const s = String(value).trim()
  return POSTAL_CODE_REGEX.test(s)
}

/** Numeric hourly rate, zero or positive */
export function isValidHourlyRate(value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0
}

/** Coerce basket quantity to integer >= 1 (client store safety). */
export function normalizeBasketItemQuantity(value) {
  const n = Math.floor(Number(value))
  if (!Number.isFinite(n) || n < 1) return 1
  return n
}

/** Strict: integer >= 1 */
export function isValidBasketItemQuantity(value) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1
}

/**
 * Validates basket items for server-side ROI / fare logic.
 * @returns {{ ok: true, items: Array } | { ok: false, error: string, items: [] }}
 */
export function validateBasketItemsForROI(basketItems) {
  if (!Array.isArray(basketItems) || basketItems.length === 0) {
    return { ok: false, error: 'Basket items are required', items: [] }
  }
  const items = []
  for (const item of basketItems) {
    if (!item || !item.item_id) {
      return { ok: false, error: 'Each basket item must include an item_id', items: [] }
    }
    const q = Number(item.quantity)
    if (!Number.isInteger(q) || q < 1) {
      return {
        ok: false,
        error: 'Each basket item must have an integer quantity of at least 1',
        items: [],
      }
    }
    items.push({ ...item, quantity: q })
  }
  return { ok: true, items }
}
