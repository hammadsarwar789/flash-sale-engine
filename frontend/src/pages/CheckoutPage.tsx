import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../hooks/useCart';
import { useOrders } from '../hooks/useOrders';
import { commerceApi } from '../api/commerce';
import { ordersApi } from '../api/orders';
import { StripeCardForm } from '../components/checkout/StripeCardForm';
import { ShippingAddress, Order, CartItem, CouponValidation } from '../types/api';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Money } from '../components/ui/Money';
import { ShieldCheck, ChevronLeft, Lock, CreditCard, Banknote } from 'lucide-react';

const WORLD_COUNTRIES = [
  { code: 'US', name: 'UNITED STATES' },
  { code: 'CA', name: 'CANADA' },
  { code: 'GB', name: 'UNITED KINGDOM' },
  { code: 'AU', name: 'AUSTRALIA' },
  { code: 'DE', name: 'GERMANY' },
  { code: 'FR', name: 'FRANCE' },
  { code: 'JP', name: 'JAPAN' },
  { code: 'IT', name: 'ITALY' },
  { code: 'ES', name: 'SPAIN' },
  { code: 'NL', name: 'NETHERLANDS' },
  { code: 'CH', name: 'SWITZERLAND' },
  { code: 'SE', name: 'SWEDEN' },
  { code: 'NO', name: 'NORWAY' },
  { code: 'DK', name: 'DENMARK' },
  { code: 'FI', name: 'FINLAND' },
  { code: 'IE', name: 'IRELAND' },
  { code: 'BE', name: 'BELGIUM' },
  { code: 'AT', name: 'AUSTRIA' },
  { code: 'NZ', name: 'NEW ZEALAND' },
  { code: 'SG', name: 'SINGAPORE' },
  { code: 'HK', name: 'HONG KONG' },
  { code: 'KR', name: 'SOUTH KOREA' },
  { code: 'BR', name: 'BRAZIL' },
  { code: 'MX', name: 'MEXICO' },
  { code: 'AR', name: 'ARGENTINA' },
  { code: 'IN', name: 'INDIA' },
  { code: 'PK', name: 'PAKISTAN' },
  { code: 'SA', name: 'SAUDI ARABIA' },
  { code: 'AE', name: 'UNITED ARAB EMIRATES' },
  { code: 'QA', name: 'QATAR' },
  { code: 'KW', name: 'KUWAIT' },
  { code: 'ZA', name: 'SOUTH AFRICA' },
  { code: 'EG', name: 'EGYPT' },
  { code: 'NG', name: 'NIGERIA' },
  { code: 'KE', name: 'KENYA' },
];

export const CheckoutPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { cart } = useCart();
  const { checkout, guestCheckout, isCheckingOut, isGuestCheckingOut } = useOrders();
  const navigate = useNavigate();
  const location = useLocation();

  const initialCouponCode = (location.state as any)?.couponCode || '';

  const [isGuestMode, setIsGuestMode] = useState(!isAuthenticated);
  const [guestEmail, setGuestEmail] = useState('');

  // Shipping Address state
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState(user?.full_name || '');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('UNITED STATES');
  const [phone, setPhone] = useState('');

  // Payment Method State: 'card' or 'cod'
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cod'>('card');

  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isPaymentCompleted, setIsPaymentCompleted] = useState(false);

  const subtotal = cart?.subtotal || 0;
  const discount = appliedCoupon?.calculated_discount || 0;
  const tax = Math.round((subtotal - discount) * 0.08 * 100) / 100;
  const total = Math.max(0, subtotal - discount + tax);

  useEffect(() => {
    if (initialCouponCode && subtotal > 0 && !appliedCoupon) {
      commerceApi.validateCoupon(initialCouponCode, subtotal)
        .then((res) => {
          if (res.valid) {
            setAppliedCoupon(res);
          }
        })
        .catch((e) => console.warn('Could not validate initial coupon code', e));
    }
  }, [initialCouponCode, subtotal]);

  useEffect(() => {
    if (isAuthenticated) {
      commerceApi.listShippingAddresses().then((addrs) => {
        setShippingAddresses(addrs);
        if (addrs.length > 0 && addrs[0].id) {
          setSelectedAddressId(addrs[0].id);
          const first = addrs[0];
          setRecipientName(first.recipient_name || user?.full_name || '');
          setAddressLine1(first.address_line1 || '');
          setCity(first.city || '');
          setState(first.state || '');
          setPostalCode(first.postal_code || '');
          setCountry(first.country || 'UNITED STATES');
          setPhone(first.phone || '');
        }
      }).catch((e) => console.warn('Could not load shipping addresses', e));
    }
  }, [isAuthenticated]);

  const selectSavedAddress = (addr: ShippingAddress) => {
    setSelectedAddressId(addr.id || null);
    setRecipientName(addr.recipient_name || '');
    setAddressLine1(addr.address_line1 || '');
    setCity(addr.city || '');
    setState(addr.state || '');
    setPostalCode(addr.postal_code || '');
    setCountry(addr.country || 'UNITED STATES');
    setPhone(addr.phone || '');
  };

  const handleAddNewAddressOption = () => {
    setSelectedAddressId(null);
    setAddressLine1('');
    setCity('');
    setState('');
    setPostalCode('');
    setPhone('');
  };

  const items = cart?.items || [];

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (!addressLine1.trim() || !city.trim() || !state.trim() || !postalCode.trim() || !country.trim() || !phone.trim()) {
      setCheckoutError('Please complete all required shipping address & phone number fields.');
      return;
    }

    const idempotencyKey = crypto.randomUUID();
    const couponCode = appliedCoupon?.code;

    try {
      let orderRes: Order;
      let savedAddrId = selectedAddressId;

      if (isAuthenticated && !savedAddrId && addressLine1.trim()) {
        const newAddr = await commerceApi.createShippingAddress({
          recipient_name: recipientName.trim() || user?.full_name || 'Customer',
          address_line1: addressLine1.trim(),
          city: city.trim(),
          state: state.trim(),
          postal_code: postalCode.trim(),
          country: country.trim(),
          phone: phone.trim(),
        }).catch((err) => {
          console.warn('Could not save address to user profile:', err);
          return null;
        });
        if (newAddr?.id) savedAddrId = newAddr.id;
      }

      if (isGuestMode) {
        if (!guestEmail.trim()) {
          setCheckoutError('Guest email is required');
          return;
        }
        const formattedItems = items.map((i: CartItem) => ({
          product_id: i.product_id,
          variant_id: i.variant_id,
          quantity: i.quantity,
        }));
        const res = await guestCheckout({
          email: guestEmail,
          items: formattedItems,
          idempotencyKey,
          couponCode,
          shippingAddress: {
            recipient_name: recipientName.trim() || 'Guest Customer',
            address_line1: addressLine1.trim(),
            city: city.trim(),
            state: state.trim(),
            postal_code: postalCode.trim(),
            country: country.trim(),
            phone: phone.trim(),
          },
        });
        orderRes = res.order;
      } else {
        const res = await checkout({
          idempotencyKey,
          couponCode,
          shippingAddressId: savedAddrId || undefined,
        });
        orderRes = res.order;
      }

      setCreatedOrder(orderRes);
      localStorage.removeItem('cart_hold_expires_at');

      if (paymentMethod === 'cod') {
        setIsPaymentCompleted(true);
        setTimeout(() => {
          navigate(`/orders/${orderRes.id}`);
        }, 1500);
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'Order reservation failed.');
    }
  };

  const handlePaymentCompleted = async (paymentId: string) => {
    setIsPaymentCompleted(true);
    if (createdOrder?.id) {
      try {
        await ordersApi.payOrder(createdOrder.id);
      } catch (err: any) {
        console.error('Failed to transition order status to PAID:', err);
      }
      setTimeout(() => {
        navigate(`/orders/${createdOrder.id}`);
      }, 1200);
    }
  };

  const handleRestoreCart = async () => {
    if (!createdOrder?.id) return;
    try {
      await ordersApi.restoreOrderToCart(createdOrder.id);
      navigate('/cart');
    } catch (err: any) {
      setCheckoutError(err.message || 'Failed to cancel reservation and restore cart.');
    }
  };

  if (items.length === 0 && !createdOrder) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4 border border-line bg-surface rounded-card p-8">
        <h2 className="font-display text-2xl font-bold text-text">Cart is empty</h2>
        <p className="font-mono text-xs text-text-mute">Reserve items on the floor before entering checkout.</p>
        <button
          onClick={() => navigate('/products')}
          className="bg-amber text-on-amber font-sans font-semibold text-xs uppercase tracking-wider px-6 py-2.5 rounded-card hover:bg-amber-press transition-colors"
        >
          ← Return to Floor
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[760px] mx-auto space-y-8">
      {/* Checkout Header */}
      <div className="border-b border-line pb-4 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/cart')}
            className="font-mono text-xs text-text-mute hover:text-text flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>BACK TO CART</span>
          </button>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-text tracking-tight mt-1">Checkout</h1>
        </div>
        <div className="font-mono text-xs text-text-mute flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-mint" />
          <span>256-BIT ENCRYPTED</span>
        </div>
      </div>

      {checkoutError && (
        <div className="p-3.5 border border-rose/40 bg-rose-soft text-rose font-mono text-xs rounded-card">
          ● {checkoutError}
        </div>
      )}

      {/* Post-Checkout Payment Modal / Block */}
      {createdOrder && (
        <div className="border border-mint/40 bg-surface rounded-card p-8 space-y-6 text-center">
          <div className="space-y-1">
            <Eyebrow className="text-mint block">ORDER RESERVATION CONFIRMED</Eyebrow>
            <h2 className="font-display text-3xl font-bold text-text">Order #{createdOrder.id}</h2>
            <div className="font-mono text-xs text-text-mute">
              Status: <span className="text-mint font-semibold">{createdOrder.status || 'PENDING'}</span>
            </div>
          </div>

          {paymentMethod === 'cod' ? (
            <div className="font-mono text-xs text-mint p-4 border border-mint/30 bg-mint-soft rounded-card space-y-2">
              <p className="font-semibold">💵 CASH ON DELIVERY CONFIRMED</p>
              <p className="text-text-dim">Please prepare <Money amount={createdOrder.total_amount || total} size="inline" /> in cash upon courier arrival.</p>
              <p className="text-text pt-1">REDIRECTING TO ORDER TIMELINE...</p>
            </div>
          ) : !isPaymentCompleted ? (
            <div className="border-t border-line pt-6 text-left space-y-4">
              <Eyebrow className="text-text-mute block">ENTER STRIPE PAYMENT CREDENTIALS</Eyebrow>
              <StripeCardForm
                amount={createdOrder.total_amount || total}
                isProcessing={false}
                onPaymentSuccess={handlePaymentCompleted}
              />
              <div className="border-t border-line pt-4 text-center space-y-2 font-mono text-xs">
                <p className="text-text-mute">
                  Decided not to pay now? Cancel this hold and restore items to your cart.
                </p>
                <button
                  type="button"
                  onClick={handleRestoreCart}
                  className="px-4 py-2 bg-raised border border-rose/30 text-rose hover:bg-rose-soft font-semibold uppercase transition-colors rounded-card"
                >
                  ← CANCEL HOLD & RETURN ITEMS TO CART
                </button>
              </div>
            </div>
          ) : (
            <div className="font-mono text-xs text-mint p-4 border border-mint/40 bg-mint-soft rounded-card">
              PAYMENT AUTHORIZED. REDIRECTING TO ORDER FULFILLMENT TIMELINE...
            </div>
          )}
        </div>
      )}

      {/* 3 Numbered Steps Form */}
      {!createdOrder && (
        <form onSubmit={handlePlaceOrder} className="space-y-8">
          
          {/* Step 1: Contact / Guest */}
          <div className="bg-surface border border-line rounded-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-raised text-amber font-mono text-xs font-bold flex items-center justify-center border border-line">1</span>
                <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-text">CONTACT INFORMATION</h2>
              </div>
              {!isAuthenticated && (
                <label className="font-mono text-xs text-text-mute flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGuestMode}
                    onChange={(e) => setIsGuestMode(e.target.checked)}
                    className="rounded border-line text-amber focus:ring-sky"
                  />
                  <span>GUEST CHECKOUT</span>
                </label>
              )}
            </div>

            {isGuestMode ? (
              <div>
                <Eyebrow className="text-text-mute mb-1 block">GUEST EMAIL ADDRESS</Eyebrow>
                <input
                  type="email"
                  required
                  placeholder="GUEST@EXAMPLE.COM"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full bg-raised border border-line focus:border-sky px-3.5 py-2.5 text-sm font-mono text-text placeholder:text-text-mute focus:outline-none rounded-card transition-colors"
                />
              </div>
            ) : (
              <div className="font-mono text-xs text-text-dim border border-line p-3 bg-raised rounded-card flex justify-between items-center">
                <span>ACCOUNT: {user?.email}</span>
                <span className="text-mint font-semibold">● AUTHENTICATED</span>
              </div>
            )}
          </div>

          {/* Step 2: Shipping Address */}
          <div className="bg-surface border border-line rounded-card p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-line pb-3">
              <span className="w-6 h-6 rounded-full bg-raised text-amber font-mono text-xs font-bold flex items-center justify-center border border-line">2</span>
              <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-text">SHIPPING & DISPATCH ADDRESS</h2>
            </div>

            {/* Saved Addresses Picker */}
            {shippingAddresses.length > 0 && !isGuestMode && (
              <div className="space-y-2">
                <Eyebrow className="text-text-mute block">SELECT SAVED ADDRESS</Eyebrow>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {shippingAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => selectSavedAddress(addr)}
                      className={`p-3 border text-left font-mono text-xs transition-colors rounded-card ${
                        selectedAddressId === addr.id
                          ? 'bg-raised border-amber text-text ring-1 ring-amber'
                          : 'bg-surface text-text border-line hover:border-line-strong'
                      }`}
                    >
                      <p className="font-sans font-semibold text-text">{addr.recipient_name}</p>
                      <p className="text-text-dim">{addr.address_line1}</p>
                      <p className="text-text-mute">{addr.city}, {addr.state} {addr.postal_code} — {addr.country}</p>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddNewAddressOption}
                    className={`p-3 border border-dashed text-left font-mono text-xs transition-colors rounded-card flex items-center justify-center ${
                      selectedAddressId === null
                        ? 'bg-raised border-amber text-text ring-1 ring-amber'
                        : 'border-line text-text-mute hover:text-text'
                    }`}
                  >
                    + USE NEW SHIPPING ADDRESS
                  </button>
                </div>
              </div>
            )}

            {/* Address Input Fields */}
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Eyebrow className="text-text-mute mb-1 block">FULL NAME</Eyebrow>
                  <input
                    type="text"
                    required
                    placeholder="JANE DOE"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full bg-raised border border-line focus:border-sky px-3.5 py-2.5 text-sm font-sans text-text focus:outline-none rounded-card transition-colors"
                  />
                </div>
                <div>
                  <Eyebrow className="text-text-mute mb-1 block">PHONE NUMBER</Eyebrow>
                  <input
                    type="tel"
                    required
                    placeholder="+1 555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-raised border border-line focus:border-sky px-3.5 py-2.5 text-sm font-mono text-text focus:outline-none rounded-card transition-colors"
                  />
                </div>
              </div>

              <div>
                <Eyebrow className="text-text-mute mb-1 block">STREET ADDRESS</Eyebrow>
                <input
                  type="text"
                  required
                  placeholder="100 WALL STREET, SUITE 400"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full bg-raised border border-line focus:border-sky px-3.5 py-2.5 text-sm font-sans text-text focus:outline-none rounded-card transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Eyebrow className="text-text-mute mb-1 block">CITY</Eyebrow>
                  <input
                    type="text"
                    required
                    placeholder="NEW YORK"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-raised border border-line focus:border-sky px-3.5 py-2.5 text-sm font-sans text-text focus:outline-none rounded-card transition-colors"
                  />
                </div>
                <div>
                  <Eyebrow className="text-text-mute mb-1 block">STATE / PROVINCE</Eyebrow>
                  <input
                    type="text"
                    required
                    placeholder="NY"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-raised border border-line focus:border-sky px-3.5 py-2.5 text-sm font-sans text-text focus:outline-none rounded-card transition-colors"
                  />
                </div>
                <div>
                  <Eyebrow className="text-text-mute mb-1 block">POSTAL / ZIP CODE</Eyebrow>
                  <input
                    type="text"
                    required
                    placeholder="10005"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full bg-raised border border-line focus:border-sky px-3.5 py-2.5 text-sm font-mono text-text focus:outline-none rounded-card transition-colors"
                  />
                </div>
              </div>

              <div>
                <Eyebrow className="text-text-mute mb-1 block">COUNTRY</Eyebrow>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-raised border border-line focus:border-sky px-3.5 py-2.5 text-sm font-mono text-text focus:outline-none rounded-card transition-colors cursor-pointer"
                >
                  {WORLD_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 3: Payment Method Selection */}
          <div className="bg-surface border border-line rounded-card p-6 space-y-4">
            <div className="flex items-center space-x-2 border-b border-line pb-3">
              <span className="w-6 h-6 rounded-full bg-raised text-amber font-mono text-xs font-bold flex items-center justify-center border border-line">3</span>
              <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-text">PAYMENT SETTLEMENT</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-4 border rounded-card text-left transition-colors flex items-center gap-3 ${
                  paymentMethod === 'card'
                    ? 'bg-raised border-amber text-text ring-1 ring-amber'
                    : 'bg-surface text-text-dim border-line hover:border-line-strong'
                }`}
              >
                <CreditCard className="w-5 h-5 text-amber" />
                <div>
                  <span className="font-sans font-bold text-xs block text-text">STRIPE CREDIT / DEBIT CARD</span>
                  <span className="font-mono text-[10px] text-text-mute">Instant Authorization</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`p-4 border rounded-card text-left transition-colors flex items-center gap-3 ${
                  paymentMethod === 'cod'
                    ? 'bg-raised border-amber text-text ring-1 ring-amber'
                    : 'bg-surface text-text-dim border-line hover:border-line-strong'
                }`}
              >
                <Banknote className="w-5 h-5 text-mint" />
                <div>
                  <span className="font-sans font-bold text-xs block text-text">CASH ON DELIVERY (COD)</span>
                  <span className="font-mono text-[10px] text-text-mute">Pay upon courier arrival</span>
                </div>
              </button>
            </div>
          </div>

          {/* Order Summary Spec & Submit */}
          <div className="bg-surface border border-line rounded-card p-6 space-y-4">
            <div className="flex items-center justify-between font-mono text-xs text-text-dim">
              <span>ITEMS RESERVED ({items.length})</span>
              <Money amount={subtotal} size="inline" />
            </div>

            {appliedCoupon && (
              <div className="flex items-center justify-between font-mono text-xs text-mint">
                <span>COUPON DISCOUNT ({appliedCoupon.code})</span>
                <span>−${discount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex items-center justify-between font-mono text-xs text-text-dim">
              <span>ESTIMATED TAX (8%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between font-mono text-xs text-text-dim">
              <span>COURIER SHIPPING</span>
              <span className="text-mint font-semibold">FREE INCLUDED</span>
            </div>

            <div className="border-t border-line pt-4 flex items-baseline justify-between">
              <div>
                <span className="font-display font-bold text-lg text-text">FINAL AMOUNT DUE</span>
                <p className="font-mono text-[11px] text-text-mute">Includes all duties and taxes</p>
              </div>
              <Money amount={total} size="xl" />
            </div>

            <button
              type="submit"
              disabled={isCheckingOut || isGuestCheckingOut}
              className="w-full bg-amber text-on-amber hover:bg-amber-press disabled:opacity-50 h-12 rounded-card font-sans font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm mt-4"
            >
              {isCheckingOut || isGuestCheckingOut ? (
                <span>IDEMPOTENT ORDER ALLOCATION IN PROGRESS...</span>
              ) : (
                <span>PLACE ORDER & RESERVE — ${total.toFixed(2)}</span>
              )}
            </button>

            <div className="font-mono text-[11px] text-text-mute text-center pt-2 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-mint" />
              <span>Idempotency-Key attached · 10:00 reservation hold guarantees allocation</span>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
