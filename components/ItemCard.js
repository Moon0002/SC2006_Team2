'use client'

// ItemCard - Displays grocery item with price and quantity controls for basket management
import { useBasketStore } from '@/stores/basketStore'
import { Plus, Minus, Trash2 } from 'lucide-react'
import styles from './ItemCard.module.css'

export default function ItemCard({ item }) {
  const { items, addItem, removeItem, updateQuantity } = useBasketStore()
  
  const basketItem = items.find((i) => i.item_id === item.item_id)
  const quantity = basketItem?.quantity || 0

  const handleAdd = () => {
    addItem(item, 1)
  }

  const handleRemove = () => {
    if (quantity > 1) {
      updateQuantity(item.item_id, quantity - 1)
    } else {
      removeItem(item.item_id)
    }
  }

  const handleDelete = () => {
    removeItem(item.item_id)
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.itemInfo}>
          <h3 className={styles.itemName}>{item.item_name}</h3>
          <p className={styles.itemCategory}>{item.category}</p>
        </div>
        <div className={styles.itemPrice}>
          <div className={styles.itemPriceValue}>
            ${item.estimated_price?.toFixed(2) || '0.00'}
          </div>
          <div className={styles.itemPriceUnit}>per unit</div>
        </div>
      </div>

      {quantity > 0 ? (
        <div className={styles.quantityControls}>
          <div className={styles.quantityButtons}>
            <button
              onClick={handleRemove}
              className={styles.quantityButton}
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className={styles.quantityDisplay}>
              {quantity}
            </span>
            <button
              onClick={handleAdd}
              className={styles.quantityButton}
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleDelete}
            className={styles.removeButton}
            aria-label="Remove from basket"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleAdd}
          className={styles.addButton}
        >
          <Plus className="w-4 h-4" />
          Add to Basket
        </button>
      )}

      {quantity > 0 && (
        <div className={styles.subtotal}>
          Subtotal: <span className={styles.subtotalValue}>
            ${(item.estimated_price * quantity).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )
}
