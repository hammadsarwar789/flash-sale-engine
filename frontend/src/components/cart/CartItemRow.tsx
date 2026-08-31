import React from 'react';
import { CartItem } from '../../types/api';
import { useCart } from '../../hooks/useCart';
import { Money } from '../ui/Money';
import { Minus, Plus, Trash2 } from 'lucide-react';

interface CartItemRowProps {
  item: CartItem;
  itemIndex: number;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({ item, itemIndex }) => {
  const { updateCartItem, deleteCartItem, isUpdatingCartItem, isDeletingCartItem } = useCart();

  const handleQuantityChange = async (newQty: number) => {
    if (newQty <= 0) {
      await deleteCartItem(item.id);
    } else {
      await updateCartItem({ item_id: item.id, quantity: newQty });
    }
  };

  const productImg =
    item.product?.images && item.product.images.length > 0
      ? item.product.images[0]
      : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';

  const unitPrice = item.unit_price || item.variant?.price || item.product?.price || 0;
  const subtotal = item.subtotal || unitPrice * item.quantity;
  const issueNumber = `#${String(itemIndex + 1).padStart(2, '0')}`;

  return (
    <div className="py-5 border-b border-line space-y-3 bg-surface p-4 rounded-card border mb-3">
      <div className="font-mono text-[11px] text-text-mute flex items-center justify-between">
        <span>ITEM {issueNumber}</span>
        <span>SKU: {item.variant?.sku || item.product?.sku || 'FSE-COMMODITY'}</span>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Product Image & Title */}
        <div className="flex items-center space-x-4">
          <div className="w-18 h-18 bg-raised border border-line rounded-card overflow-hidden flex-shrink-0">
            <img
              src={productImg}
              alt={item.product?.name || 'Cart item'}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
              }}
            />
          </div>

          <div className="space-y-1">
            <h4 className="font-sans text-[16px] font-semibold text-text">
              {item.product?.name || `Product #${item.product_id}`}
            </h4>
            
            <div className="font-mono text-xs text-text-mute">
              {[item.variant?.color, item.variant?.size].filter(Boolean).join(' · ') || 'STANDARD EDITION'}
            </div>

            <Money amount={Number(unitPrice)} size="inline" className="text-text-dim" />
          </div>
        </div>

        {/* Stepper (999px pill) & Line Total */}
        <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-6 font-mono text-xs">
          {/* Quantity Stepper */}
          <div className="flex items-center bg-raised border border-line rounded-pill px-2 py-1 text-xs">
            <button
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={isUpdatingCartItem || isDeletingCartItem}
              className="w-6 h-6 flex items-center justify-center text-text-dim hover:text-text disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-7 text-center text-text font-bold tabular-nums">{item.quantity}</span>
            <button
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={isUpdatingCartItem}
              className="w-6 h-6 flex items-center justify-center text-text-dim hover:text-text disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Subtotal & Delete Link */}
          <div className="text-right space-y-1">
            <Money amount={Number(subtotal)} size="inline" className="font-bold text-text block" />
            <button
              onClick={() => deleteCartItem(item.id)}
              disabled={isDeletingCartItem}
              className="text-text-mute hover:text-rose text-[11px] font-mono uppercase transition-colors inline-flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>REMOVE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
