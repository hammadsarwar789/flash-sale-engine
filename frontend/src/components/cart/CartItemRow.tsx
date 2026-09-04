import React from 'react';
import { CartItem } from '../../types/api';
import { useCart } from '../../hooks/useCart';
import { useToast } from '../../context/ToastContext';
import { MAX_PER_ORDER } from '../../types/cart';
import { Money } from '../ui/Money';
import { Minus, Plus, Trash2 } from 'lucide-react';

interface CartItemRowProps {
  item: CartItem;
  itemIndex: number;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({ item, itemIndex }) => {
  const { updateCartItem, deleteCartItem, addToCart, isUpdatingCartItem, isDeletingCartItem } = useCart();
  const toast = useToast();

  const availableStock = item.variant?.available_stock ?? item.product?.available_stock ?? 10;
  const maxAllowed = Math.min(availableStock, MAX_PER_ORDER);
  const isLowStock = availableStock > 0 && availableStock <= 5;

  const handleRemoveWithUndo = async () => {
    const savedItem = { ...item };
    await deleteCartItem(item.id);
    toast.action(
      'Item removed from cart.',
      'UNDO',
      async () => {
        try {
          await addToCart({
            product_id: savedItem.product_id,
            variant_id: savedItem.variant_id,
            quantity: savedItem.quantity,
          });
          toast.success('Item restored to cart');
        } catch {
          toast.error('Could not restore item to cart');
        }
      },
      5000
    );
  };

  const handleQuantityChange = async (newQty: number) => {
    if (newQty <= 0) {
      await handleRemoveWithUndo();
    } else {
      await updateCartItem({ item_id: item.id, quantity: newQty, max_stock: availableStock });
    }
  };

  const handleDecrement = async () => {
    if (item.quantity <= 1) {
      await handleRemoveWithUndo();
    } else {
      await handleQuantityChange(item.quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (item.quantity >= maxAllowed) {
      toast.info(`Maximum available stock reached (${availableStock} available in pool)`);
      return;
    }
    handleQuantityChange(item.quantity + 1);
  };

  const productImg =
    item.image_url ||
    (item as any).product?.image_url ||
    (item as any).product?.imageUrl ||
    (item.product?.images && item.product.images.length > 0 ? item.product.images[0] : null) ||
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80';

  const unitPrice = item.unit_price || item.variant?.price || item.product?.price || 0;
  const subtotal = item.subtotal || unitPrice * item.quantity;
  const issueNumber = `#${String(itemIndex + 1).padStart(2, '0')}`;
  const productName =
    (item as any).product_title ||
    item.product_name ||
    item.product?.name ||
    (item as any).name ||
    'Product';
  const variantDisplay =
    item.variant_name ||
    (item.variant ? [item.variant.color, item.variant.size].filter(Boolean).join(' · ') : '') ||
    'Standard Edition';

  return (
    <div className="py-5 border-b border-line space-y-4 bg-surface p-4 sm:p-5 rounded-card border mb-3 shadow-xs">
      <div className="font-mono text-[11px] text-text-mute flex items-center justify-between pb-2 border-b border-line/40">
        <span>ITEM {issueNumber}</span>
        {isLowStock ? (
          <span className="text-amber font-bold">⚡ ONLY {availableStock} LEFT</span>
        ) : (
          <span className="text-mint font-bold">● RESERVED IN HOLD</span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        {/* Left: Product Thumbnail with fixed aspect ratio */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 max-w-[150px] aspect-square bg-raised border border-line rounded-md overflow-hidden flex-shrink-0">
          <img
            src={productImg}
            alt={productName}
            className="w-full h-full object-cover rounded-md"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80';
            }}
          />
        </div>

        {/* Middle: Details (grow) */}
        <div className="flex-1 min-w-0 space-y-2">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate sm:whitespace-normal">
            {productName}
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-mono bg-raised border border-line text-neutral-700 dark:text-neutral-300">
              {variantDisplay}
            </span>
            {isLowStock && (
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber font-bold">
                <span>⚡</span>
                <span>Only {availableStock} left in pool</span>
              </span>
            )}
          </div>

          <div className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
            ${Number(unitPrice).toFixed(2)} each
          </div>
        </div>

        {/* Right: Dedicated Controls, Subtotal & Remove */}
        <div className="flex sm:flex-col md:flex-row items-center sm:items-end md:items-center justify-between sm:justify-center w-full sm:w-auto gap-4 flex-shrink-0">
          {/* Quantity Stepper Container */}
          <div className="flex items-center bg-raised border border-line rounded-lg px-2 py-1 text-xs">
            <button
              onClick={handleDecrement}
              disabled={isUpdatingCartItem || isDeletingCartItem}
              className={`w-7 h-7 flex items-center justify-center rounded transition-colors disabled:opacity-40 cursor-pointer ${
                item.quantity === 1
                  ? 'text-rose-500 hover:bg-rose-500/10 hover:text-rose-600'
                  : 'text-text-dim hover:text-text'
              }`}
              aria-label={item.quantity === 1 ? 'Remove item from cart' : 'Decrease quantity'}
            >
              {item.quantity === 1 ? (
                <Trash2 className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
            </button>
            <span className="w-8 text-center text-neutral-900 dark:text-neutral-100 font-bold tabular-nums font-mono text-sm">
              {item.quantity}
            </span>
            <button
              onClick={handleIncrement}
              disabled={isUpdatingCartItem || item.quantity >= maxAllowed}
              className="w-7 h-7 flex items-center justify-center text-text-dim hover:text-text disabled:opacity-40 rounded transition-colors cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Subtotal & Delete Link */}
          <div className="text-right space-y-1 sm:min-w-[90px]">
            <div className="text-base font-bold text-neutral-900 dark:text-neutral-100 font-mono">
              ${Number(subtotal).toFixed(2)}
            </div>
            <button
              onClick={handleRemoveWithUndo}
              disabled={isDeletingCartItem}
              className="text-neutral-400 hover:text-rose-500 dark:hover:text-rose-400 text-xs font-mono uppercase tracking-wider transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>REMOVE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
