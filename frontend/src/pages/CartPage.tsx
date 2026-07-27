import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { CartItemRow } from '../components/cart/CartItemRow';
import { CouponInput } from '../components/cart/CouponInput';
import { CouponValidation, CartItem } from '../types/api';
import { Numeric } from '../components/ui/Numeric';
import { Eyebrow } from '../components/ui/Eyebrow';

export const CartPage: React.FC = () => {
  const { cart, isLoading, clearCart } = useCart();
  const navigate = useNavigate();

  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(299); // 04:59 hold timer

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isTimerLow = secondsRemaining <= 60;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-14 w-48 bg-paper-sunk border border-rule"></div>
        <div className="h-64 bg-paper-sunk border border-rule"></div>
      </div>
    );
  }

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const discount = appliedCoupon?.calculated_discount || 0;
  const total = Math.max(0, subtotal - discount);

  if (items.length === 0) {
    return (
      <div className="py-20 text-center space-y-4 border border-rule bg-paper">
        <h1 className="font-serif text-[48px] text-ink">Cart is empty.</h1>
        <p className="font-mono text-xs text-ash">No reserved inventory holds active.</p>
        <Link to="/products" className="inline-block bg-ink text-paper font-mono text-xs uppercase px-6 py-2">
          ← Return to Floor
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Editorial Cart Header */}
      <div className="border-b border-rule pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[56px] leading-none text-ink font-normal">Cart.</h1>
          <div className="font-mono text-xs text-ash mt-2 flex items-center space-x-2">
            <span>{String(cart?.item_count || 0).padStart(2, '0')} items reserved</span>
            <span>·</span>
            <span>hold expires</span>
            <span className={`font-semibold ${isTimerLow ? 'text-signal animate-pulse' : 'text-ink'}`}>
              {formatTimer(secondsRemaining)}
            </span>
          </div>
        </div>

        <button
          onClick={() => clearCart()}
          className="font-mono text-xs text-ash hover:text-loss underline uppercase"
        >
          [ CLEAR ALL RESERVATIONS ]
        </button>
      </div>

      {/* Cart Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left Column: Line Items */}
        <div className="lg:col-span-8 space-y-0 border-t border-rule">
          {items.map((item: CartItem, idx: number) => (
            <CartItemRow key={item.id} item={item} itemIndex={idx} />
          ))}
        </div>

        {/* Right Column: Sticky Summary Panel (320px layout) */}
        <div className="lg:col-span-4 sticky top-28 space-y-6 border border-rule p-6 bg-paper">
          <Eyebrow className="text-ash block border-b border-rule pb-3">SUMMARY</Eyebrow>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between text-ink">
              <Eyebrow className="text-ash">SUBTOTAL</Eyebrow>
              <Numeric value={subtotal} format="price" zeroPadInt={3} />
            </div>

            <div className="flex justify-between text-ink">
              <Eyebrow className="text-ash">SHIPPING</Eyebrow>
              <span className="text-gain font-semibold">FREE</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-gain font-semibold border-t border-rule/30 pt-2">
                <span>COUPON ({appliedCoupon?.code})</span>
                <Numeric value={-discount} format="price" zeroPadInt={2} />
              </div>
            )}

            <div className="border-t border-rule pt-4 flex justify-between items-baseline">
              <Eyebrow className="text-ink text-sm">TOTAL</Eyebrow>
              <Numeric value={total} format="price" zeroPadInt={3} className="text-2xl text-ink font-medium" />
            </div>
          </div>

          <div className="pt-2 border-t border-rule">
            <CouponInput
              cartSubtotal={subtotal}
              appliedCoupon={appliedCoupon}
              onCouponApplied={(coupon) => setAppliedCoupon(coupon.valid ? coupon : null)}
            />
          </div>

          {/* Checkout Signal CTA */}
          <button
            onClick={() => navigate('/checkout', { state: { couponCode: appliedCoupon?.code } })}
            className="w-full h-14 bg-signal text-signal-ink font-sans text-sm font-semibold uppercase tracking-widest hover:opacity-90 transition-opacity border border-signal rounded-none"
          >
            CHECKOUT →
          </button>
        </div>

      </div>
    </div>
  );
};
