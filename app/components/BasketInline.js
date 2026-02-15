'use client'

// BasketInline - Displays basket items with quantity controls and total price at bottom of page
import { useBasketStore } from '@/lib/stores/basketStore'
import { Plus, Minus, Trash2, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import styles from './BasketInline.module.css'

export default function BasketInline() {
  const { items, removeItem, updateQuantity, clearBasket, getTotalItems, getTotalPrice } = useBasketStore()

  const totalItems = getTotalItems()
  const totalPrice = getTotalPrice()

  if (items.length === 0) {
    return null
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <ShoppingCart className={styles.headerIcon} />
          <h2 className={styles.headerTitle}>
            Basket ({totalItems})
          </h2>
        </div>
      </div>

      <div className={styles.itemsList}>
        <div className={styles.itemsContainer}>
          {items.map((item) => (
            <div
              key={item.item_id}
              className={styles.itemCard}
            >
              <div className={styles.itemHeader}>
                <div className={styles.itemInfo}>
                  <h3 className={styles.itemName}>{item.item_name}</h3>
                  <p className={styles.itemCategory}>{item.category}</p>
                </div>
                <button
                  onClick={() => removeItem(item.item_id)}
                  className={styles.removeButton}
                  aria-label="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className={styles.itemControls}>
                <div className={styles.quantityControls}>
                  <button
                    onClick={() => updateQuantity(item.item_id, item.quantity - 1)}
                    className={styles.quantityButton}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className={styles.quantityDisplay}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.item_id, item.quantity + 1)}
                    className={styles.quantityButton}
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className={styles.itemPrice}>
                  <div className={styles.itemTotal}>
                    ${(item.estimated_price * item.quantity).toFixed(2)}
                  </div>
                  <div className={styles.itemUnitPrice}>
                    ${item.estimated_price.toFixed(2)} each
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.footerRow}>
          <span className={styles.footerLabel}>Total Items:</span>
          <span className={styles.footerValue}>{totalItems}</span>
        </div>
        <div className={styles.footerTotal}>
          <span className={styles.footerTotalLabel}>Estimated Total:</span>
          <span className={styles.footerTotalValue}>
            ${totalPrice.toFixed(2)}
          </span>
        </div>
        <div className={styles.footerActions}>
          <button
            onClick={clearBasket}
            className={styles.clearButton}
          >
            Clear Basket
          </button>
          <Link
            href="/roi"
            className={styles.calculateButton}
          >
            Calculate ROI →
          </Link>
        </div>
      </div>
    </div>
  )
}
