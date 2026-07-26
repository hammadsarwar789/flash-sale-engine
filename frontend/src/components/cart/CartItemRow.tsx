import React from 'react';
import { Plus, Minus, Trash2, Tag } from 'lucide-react';
import { CartItem } from '../../types/api';
import { useCart } from '../../hooks/useCart';

interface CartItemRowProps {
  item: CartItem;
}

export const CartItemRow: React.FC<CartItemRowProps> = ({ item }) => {
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

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl glass-card border border-slate-800/80 gap-4 transition-all hover:border-slate-700">
      
      {/* Product Image & Info */}
      <div className="flex items-center space-x-4">
        <img
          src={productImg}
          alt={item.product?.name || 'Cart item'}
          className="w-16 h-16 object-cover rounded-xl bg-slate-900 border border-slate-800"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
          }}
        />
        <div>
          <h4 className="font-bold text-sm text-slate-100 line-clamp-1">
            {item.product?.name || `Product #${item.product_id}`}
          </h4>
          
          {item.variant && (
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="inline-flex items-center space-x-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-medium text-[11px] px-2 py-0.5 rounded-md">
                <Tag className="w-3 h-3" />
                <span>{item.variant.name}</span>
              </span>
            </div>
          )}

          <span className="text-xs text-slate-400 block mt-1">
            ${Number(unitPrice).toFixed(2)} each
          </span>
        </div>
      </div>

      {/* Quantity & Subtotal */}
      <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-6">
        {/* Quantity Controls */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button
            onClick={() => handleQuantityChange(item.quantity - 1)}
            disabled={isUpdatingCartItem || isDeletingCartItem}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-8 text-center text-sm font-bold text-white">{item.quantity}</span>
          <button
            onClick={() => handleQuantityChange(item.quantity + 1)}
            disabled={isUpdatingCartItem}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Subtotal */}
        <div className="text-right">
          <span className="text-base font-extrabold text-white block tracking-tight">
            ${Number(subtotal).toFixed(2)}
          </span>
          <button
            onClick={() => deleteCartItem(item.id)}
            disabled={isDeletingCartItem}
            className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors flex items-center space-x-1 ml-auto mt-0.5"
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
};
