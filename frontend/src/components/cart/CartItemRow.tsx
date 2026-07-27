import React from 'react';
import { CartItem } from '../../types/api';
import { useCart } from '../../hooks/useCart';
import { Numeric } from '../ui/Numeric';
import { Eyebrow } from '../ui/Eyebrow';

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
  const issueNumber = `Nº ${String(itemIndex + 1).padStart(2, '0')}`;

  return (
    <div className="py-6 border-b border-rule space-y-4">
      <div className="font-mono text-xs text-ash flex items-center justify-between">
        <span>{issueNumber}</span>
        <span>SKU: {item.variant?.sku || item.product?.sku || 'FL-ITEM'}</span>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Product Image & Title */}
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-paper-sunk border border-rule overflow-hidden flex-shrink-0">
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
            <h4 className="font-sans text-base font-medium text-ink">
              {item.product?.name || `Product #${item.product_id}`}
            </h4>
            
            <div className="font-mono text-xs text-ash">
              {[item.variant?.color, item.variant?.size].filter(Boolean).join(' · ') || 'STANDARD EDITION'}
            </div>

            <Numeric value={Number(unitPrice)} format="price" zeroPadInt={3} className="text-xs text-graphite block" />
          </div>
        </div>

        {/* Quantity Stepper & Line Total */}
        <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-8 font-mono text-xs">
          {/* Stepper */}
          <div className="flex items-center border border-rule bg-paper-sunk">
            <Eyebrow className="px-2 text-ash border-r border-rule">QTY</Eyebrow>
            <button
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={isUpdatingCartItem || isDeletingCartItem}
              className="w-7 h-7 flex items-center justify-center text-ink hover:bg-paper border-r border-rule disabled:opacity-40"
            >
              −
            </button>
            <Numeric value={item.quantity} format="integer" zeroPadInt={2} className="w-8 text-center text-ink font-semibold" />
            <button
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={isUpdatingCartItem}
              className="w-7 h-7 flex items-center justify-center text-ink hover:bg-paper border-l border-rule disabled:opacity-40"
            >
              +
            </button>
          </div>

          {/* Subtotal & Delete Link */}
          <div className="text-right space-y-1">
            <Numeric value={Number(subtotal)} format="price" zeroPadInt={3} className="text-sm font-semibold text-ink block" />
            <button
              onClick={() => deleteCartItem(item.id)}
              disabled={isDeletingCartItem}
              className="text-ash hover:text-loss text-xs underline font-mono uppercase transition-colors"
            >
              [ REMOVE ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
