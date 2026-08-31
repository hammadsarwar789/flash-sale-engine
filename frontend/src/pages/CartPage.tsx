import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { CartItemRow } from '../components/cart/CartItemRow';
import { CouponInput } from '../components/cart/CouponInput';
import { CouponValidation } from '../types/api';
import { Money } from '../components/ui/Money';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Countdown } from '../components/ui/Countdown';
import { ShieldCheck, ArrowRight, ShoppingBag } from 'lucide-react';

export const CartPage: React.FC = () => {
  const { cart, isLoading, clearCart } = useCart();
  const navigate = useNavigate();

  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);

  const items = cart?.items || [];

  useEffect(() => {
    if (items.length === 0) {
      localStorage.removeItem('cart_hold_expires_at');
      setSecondsRemaining(300);
      return;
    }

    const HOLD_DURATION_MS = 5 * 60 * 1000;
    const saved = localStorage.getItem('cart_hold_expires_at');
    let expiresAt = saved ? parseInt(saved, 10) : 0;

    if (!expiresAt || isNaN(expiresAt)) {
      expiresAt = Date.now() + HOLD_DURATION_MS;
      localStorage.setItem('cart_hold_expires_at', expiresAt.toString());
    } else if (expiresAt <= Date.now()) {
      localStorage.removeItem('cart_hold_expires_at');
      clearCart();
      setSecondsRemaining(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      if (expiresAt <= now) {
        localStorage.removeItem('cart_hold_expires_at');
        clearCart();
        setSecondsRemaining(0);
      } else {
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setSecondsRemaining(remaining);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [items.length, clearCart]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-raised rounded-card"></div>
        <div className="h-64 bg-surface border border-line rounded-card"></div>
      </div>
    );
  }

  const subtotal = cart?.subtotal || 0;
  const discount = appliedCoupon?.calculated_discount || 0;
  const total = Math.max(0, subtotal - discount);

  if (items.length === 0) {
    return (
      <div className="py-20 text-center space-y-4 border border-line bg-surface rounded-card max-w-lg mx-auto p-8">
        <div className="w-12 h-12 rounded-full bg-raised flex items-center justify-center mx-auto text-text-mute">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <h1 className="font-display text-3xl font-bold text-text">Cart is empty</h1>
        <p className="font-mono text-xs text-text-mute">No active inventory reservation holds.</p>
        <Link
          to="/products"
          className="inline-block bg-amber text-on-amber font-sans font-semibold text-xs uppercase tracking-wider px-6 py-3 rounded-card hover:bg-amber-press transition-colors"
        >
          ← Browse The Floor
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Cart Header */}
      <div className="border-b border-line pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Eyebrow className="text-amber block font-bold">RESERVED ALLOCATION</Eyebrow>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-text tracking-tight">Cart</h1>
          <div className="font-mono text-xs text-text-mute mt-2 flex items-center space-x-2">
            <span className="text-text font-semibold">{String(cart?.item_count || 0).padStart(2, '0')} items held</span>
            <span>·</span>
            <Countdown
              targetSeconds={secondsRemaining}
              label="HOLD EXPIRES IN:"
              onExpire={() => clearCart()}
            />
          </div>
        </div>

        <button
          onClick={() => clearCart()}
          className="text-xs font-mono text-text-mute hover:text-rose transition-colors underline"
        >
          CLEAR ENTIRE CART [✕]
        </button>
      </div>

      {/* 2-Column 8/4 Cart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (Line Items) — 8 cols */}
        <div className="lg:col-span-8 space-y-4">
          <div className="space-y-3">
            {items.map((item, index) => (
              <CartItemRow key={item.id} item={item} itemIndex={index} />
            ))}
          </div>

          <div className="pt-2">
            <CouponInput
              cartSubtotal={subtotal}
              appliedCoupon={appliedCoupon}
              onCouponApplied={(coupon) => setAppliedCoupon(coupon.valid ? coupon : null)}
            />
          </div>
        </div>

        {/* Right Column (Sticky Order Summary) — 4 cols */}
        <div className="lg:col-span-4 bg-surface border border-line rounded-card p-6 sm:p-8 space-y-6 lg:sticky lg:top-24">
          <div className="border-b border-line pb-4">
            <Eyebrow className="text-text-mute block">SUMMARY</Eyebrow>
            <h3 className="font-display text-xl font-bold text-text">Order Breakdown</h3>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-text-dim">
              <span>SUBTOTAL</span>
              <Money amount={subtotal} size="inline" />
            </div>

            {appliedCoupon && (
              <div className="flex items-center justify-between text-mint bg-mint-soft border border-mint/30 p-2 rounded-card">
                <span>PROMO ({appliedCoupon.code})</span>
                <span className="font-semibold">−${discount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-text-dim">
              <span>ESTIMATED TAX</span>
              <span className="text-text-mute">CALCULATED AT CHECKOUT</span>
            </div>

            <div className="flex items-center justify-between text-text-dim">
              <span>SHIPPING</span>
              <span className="text-mint font-semibold">FREE INCLUDED</span>
            </div>

            <div className="border-t border-line pt-4 flex items-baseline justify-between text-text">
              <span className="font-display font-bold text-base">TOTAL DUE</span>
              <Money amount={total} size="lg" className="font-bold text-text" />
            </div>
          </div>

          <button
            onClick={() => navigate('/checkout')}
            className="w-full bg-amber text-on-amber hover:bg-amber-press py-3.5 px-6 rounded-card font-sans font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span>PROCEED TO CHECKOUT</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="text-[11px] font-mono text-text-mute flex items-center gap-2 pt-2 border-t border-line">
            <ShieldCheck className="w-4 h-4 text-mint flex-shrink-0" />
            <span>256-bit SSL encrypted · Idempotent Stripe order hold</span>
          </div>
        </div>
      </div>
    </div>
  );
};
