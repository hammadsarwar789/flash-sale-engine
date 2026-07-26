import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { CartItemRow } from '../components/cart/CartItemRow';
import { CouponInput } from '../components/cart/CouponInput';
import { ShoppingBag, ArrowRight, Trash2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { CouponValidation, CartItem } from '../types/api';

export const CartPage: React.FC = () => {
  const { cart, isLoading, clearCart, isClearingCart } = useCart();
  const navigate = useNavigate();

  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/4"></div>
        <div className="h-40 bg-slate-900 rounded-2xl"></div>
        <div className="h-40 bg-slate-900 rounded-2xl"></div>
      </div>
    );
  }

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const discount = appliedCoupon?.calculated_discount || 0;
  const estimatedTax = Math.round(subtotal * 0.08 * 100) / 100;
  const total = Math.max(0, subtotal - discount + estimatedTax);

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6 glass-card rounded-3xl p-8 border border-slate-800">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Your Cart is Empty</h2>
          <p className="text-slate-400 text-sm">Looks like you haven't added any items to your shopping cart yet.</p>
        </div>
        <Link
          to="/products"
          className="inline-flex items-center space-x-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
        >
          <span>Explore Flash Catalog</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link to="/products" className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-400 hover:text-cyan-400">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Shopping Cart ({cart?.item_count || 0} items)</h1>
        </div>

        <button
          onClick={() => clearCart()}
          disabled={isClearingCart}
          className="flex items-center space-x-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear Cart</span>
        </button>
      </div>

      {/* Cart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Line items column */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item: CartItem) => (
            <CartItemRow key={item.id} item={item} />
          ))}
        </div>

        {/* Order Summary & Checkout Column */}
        <div className="space-y-6">
          <CouponInput
            cartSubtotal={subtotal}
            appliedCoupon={appliedCoupon}
            onCouponApplied={(coupon) => setAppliedCoupon(coupon.valid ? coupon : null)}
          />

          <div className="p-6 rounded-2xl glass-card border border-slate-800 space-y-4">
            <h3 className="font-extrabold text-base text-white border-b border-slate-800 pb-3">
              Order Summary
            </h3>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal</span>
                <span className="font-semibold text-white">${subtotal.toFixed(2)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Promo Discount ({appliedCoupon?.code})</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-300">
                <span>Estimated Tax (8%)</span>
                <span className="font-semibold text-white">${estimatedTax.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-300">
                <span>Shipping</span>
                <span className="text-emerald-400 font-bold uppercase text-xs">FREE</span>
              </div>

              <div className="border-t border-slate-800 pt-3 flex justify-between items-baseline">
                <span className="text-base font-bold text-white">Estimated Total</span>
                <span className="text-2xl font-black text-cyan-400 tracking-tight">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout', { state: { couponCode: appliedCoupon?.code } })}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-4 rounded-xl shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-center space-x-1.5 text-slate-500 text-xs text-center pt-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Idempotent Stock Lock Reserved at Checkout</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
