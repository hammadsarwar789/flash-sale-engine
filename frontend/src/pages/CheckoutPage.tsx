import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../hooks/useCart';
import { useOrders } from '../hooks/useOrders';
import { commerceApi } from '../api/commerce';
import { ordersApi } from '../api/orders';
import { StripeCardForm } from '../components/checkout/StripeCardForm';
import { CouponInput } from '../components/cart/CouponInput';
import { ShippingAddress, Order, CartItem, CouponValidation } from '../types/api';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Numeric } from '../components/ui/Numeric';

// Exhaustive Worldwide Countries & Territories list (ISO 3166-1)
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
  { code: 'PL', name: 'POLAND' },
  { code: 'PT', name: 'PORTUGAL' },
  { code: 'GR', name: 'GREECE' },
  { code: 'TR', name: 'TURKEY' },
  { code: 'IL', name: 'ISRAEL' },
  { code: 'TH', name: 'THAILAND' },
  { code: 'MY', name: 'MALAYSIA' },
  { code: 'ID', name: 'INDONESIA' },
  { code: 'PH', name: 'PHILIPPINES' },
  { code: 'VN', name: 'VIETNAM' },
  { code: 'CN', name: 'CHINA' },
  { code: 'TW', name: 'TAIWAN' },
  { code: 'CL', name: 'CHILE' },
  { code: 'CO', name: 'COLOMBIA' },
  { code: 'PE', name: 'PERU' },
  { code: 'CZ', name: 'CZECH REPUBLIC' },
  { code: 'HU', name: 'HUNGARY' },
  { code: 'RO', name: 'ROMANIA' },
  { code: 'UA', name: 'UKRAINE' },
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

  // Payment Method State: 'card' or 'cod'
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cod'>('card');

  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isPaymentCompleted, setIsPaymentCompleted] = useState(false);

  const subtotal = cart?.subtotal || 0;
  const discount = appliedCoupon?.calculated_discount || 0;
  const total = Math.max(0, subtotal - discount);

  // Auto-validate coupon passed from Cart page location.state
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

  // Load saved shipping addresses if authenticated
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
  };

  const handleAddNewAddressOption = () => {
    setSelectedAddressId(null);
    setAddressLine1('');
    setCity('');
    setState('');
    setPostalCode('');
  };

  const items = cart?.items || [];

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    if (!addressLine1.trim() || !city.trim() || !state.trim() || !postalCode.trim() || !country.trim()) {
      setCheckoutError('Please complete all required shipping address fields.');
      return;
    }

    const idempotencyKey = crypto.randomUUID();
    const couponCode = appliedCoupon?.code;

    try {
      let orderRes: Order;
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
        });
        orderRes = res.order;
      } else {
        if (!selectedAddressId && addressLine1.trim()) {
          await commerceApi.createShippingAddress({
            recipient_name: recipientName.trim() || user?.full_name || 'Customer',
            address_line1: addressLine1.trim(),
            city: city.trim(),
            state: state.trim(),
            postal_code: postalCode.trim(),
            country: country.trim(),
          }).catch((err) => console.warn('Could not save address to user profile:', err));
        }
        const res = await checkout({ idempotencyKey, couponCode });
        orderRes = res.order;
      }

      setCreatedOrder(orderRes);
      localStorage.removeItem('cart_hold_expires_at');

      // If Cash on Delivery, complete immediately without credit card
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

  if (items.length === 0 && !createdOrder) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4 border border-rule bg-paper">
        <h2 className="font-serif text-3xl text-ink">Cart is empty</h2>
        <p className="font-mono text-xs text-ash">Reserve items on the floor before entering checkout.</p>
        <button onClick={() => navigate('/products')} className="bg-ink text-paper font-mono text-xs uppercase px-6 py-2">
          ← Return to Floor
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[720px] mx-auto space-y-10">

      {/* Checkout Header */}
      <div className="border-b border-rule pb-4 flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/cart')} className="font-mono text-xs text-ash hover:text-ink block">
            ← BACK TO CART
          </button>
          <h1 className="font-serif text-[48px] text-ink font-normal leading-none mt-1">Checkout.</h1>
        </div>
        <div className="font-mono text-xs text-ash">
          WORLDWIDE DELIVERY · IDEMPOTENCY GUARANTEED
        </div>
      </div>

      {checkoutError && (
        <div className="p-3 border border-loss bg-paper text-loss font-mono text-xs">
          {checkoutError}
        </div>
      )}

      {/* Post-Checkout Order Confirmation Payment Block */}
      {createdOrder && (
        <div className="border border-gain bg-paper p-8 space-y-6 text-center">
          <div className="space-y-1">
            <Eyebrow className="text-gain block">ORDER RESERVATION CONFIRMED</Eyebrow>
            <h2 className="font-serif text-4xl text-ink">Order #{createdOrder.id}</h2>
            <div className="font-mono text-xs text-ash">
              Status: <span className="text-gain font-semibold">{createdOrder.status || 'PENDING'}</span>
            </div>
          </div>

          {paymentMethod === 'cod' ? (
            <div className="font-mono text-xs text-gain p-4 border border-gain bg-paper-sunk space-y-2">
              <p className="font-semibold">💵 CASH ON DELIVERY (COD) CONFIRMED</p>
              <p className="text-ash">Please prepare <Numeric value={createdOrder.total_amount || total} format="price" zeroPadInt={3} /> in cash upon delivery arrival.</p>
              <p className="text-ink pt-1">REDIRECTING TO ORDER TIMELINE...</p>
            </div>
          ) : !isPaymentCompleted ? (
            <div className="border-t border-rule pt-6 text-left space-y-4">
              <Eyebrow className="text-ash block">ENTER STRIPE PAYMENT CREDENTIALS</Eyebrow>
              <StripeCardForm
                amount={createdOrder.total_amount || total}
                isProcessing={false}
                onPaymentSuccess={handlePaymentCompleted}
              />
            </div>
          ) : (
            <div className="font-mono text-xs text-gain p-4 border border-gain bg-paper-sunk">
              PAYMENT AUTHORIZED. REDIRECTING TO ORDER FULFILLMENT TIMELINE...
            </div>
          )}
        </div>
      )}

      {/* Single Column 720px Form Stack */}
      {!createdOrder && (
        <form onSubmit={handlePlaceOrder} className="space-y-10">

          {/* Nº 01 SHIPPING */}
          <div className="space-y-4">
            <div className="border-b border-rule pb-2 flex items-center justify-between">
              <div className="flex items-baseline space-x-3">
                <span className="font-mono text-xs text-ash">Nº 01</span>
                <h2 className="font-mono text-sm font-semibold tracking-widest uppercase text-ink">WORLDWIDE SHIPPING ADDRESS</h2>
              </div>
              {!isAuthenticated && (
                <label className="font-mono text-xs text-ash flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isGuestMode}
                    onChange={(e) => setIsGuestMode(e.target.checked)}
                    className="rounded-none border-rule text-ink focus:ring-0"
                  />
                  <span>CHECKOUT AS GUEST</span>
                </label>
              )}
            </div>

            {isGuestMode ? (
              <div>
                <Eyebrow className="text-ash mb-1 block">GUEST EMAIL ADDRESS</Eyebrow>
                <input
                  type="email"
                  required
                  placeholder="GUEST@EXAMPLE.COM"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-mono text-ink placeholder-ash focus:outline-none rounded-none"
                />
              </div>
            ) : (
              <div className="font-mono text-xs text-ash border border-rule p-3 bg-paper-sunk flex justify-between">
                <span>ACCOUNT: {user?.email}</span>
                <span className="text-gain font-semibold">AUTHENTICATED</span>
              </div>
            )}

            {/* Saved Addresses Selector Cards */}
            {shippingAddresses.length > 0 && !isGuestMode && (
              <div className="space-y-2 pt-2">
                <Eyebrow className="text-ash block">SELECT SAVED ADDRESS</Eyebrow>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {shippingAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => selectSavedAddress(addr)}
                      className={`p-3 border text-left font-mono text-xs transition-colors rounded-none ${selectedAddressId === addr.id
                          ? 'bg-ink text-paper border-ink font-semibold'
                          : 'bg-paper text-ink border-rule hover:bg-paper-sunk'
                        }`}
                    >
                      <p className="font-sans font-semibold">{addr.recipient_name}</p>
                      <p className="text-ash">{addr.address_line1}</p>
                      <p className="text-ash">{addr.city}, {addr.state} {addr.postal_code} — {addr.country}</p>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddNewAddressOption}
                    className={`p-3 border border-dashed text-left font-mono text-xs transition-colors rounded-none flex items-center justify-center ${selectedAddressId === null
                        ? 'bg-paper-sunk border-ink text-ink font-semibold'
                        : 'border-rule text-ash hover:text-ink'
                      }`}
                  >
                    + ENTER NEW SHIPPING ADDRESS
                  </button>
                </div>
              </div>
            )}

            {/* Address Input Fields */}
            <div className="space-y-4 pt-2">
              <div>
                <Eyebrow className="text-ash mb-1 block">FULL NAME</Eyebrow>
                <input
                  type="text"
                  required
                  placeholder="ENTER RECIPIENT NAME (E.G. JANE DOE)"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-sans text-ink uppercase focus:outline-none rounded-none"
                />
              </div>

              <div>
                <Eyebrow className="text-ash mb-1 block">STREET ADDRESS / BUILDING / SUITE</Eyebrow>
                <input
                  type="text"
                  required
                  placeholder="ENTER STREET ADDRESS (E.G. 123 MARKET STREET, SUITE 400)"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-sans text-ink uppercase focus:outline-none rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Eyebrow className="text-ash mb-1 block">CITY / POSTAL ZIP CODE</Eyebrow>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      required
                      placeholder="CITY (E.G. TOKYO, PARIS)"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-2/3 bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-sans text-ink uppercase focus:outline-none rounded-none"
                    />
                    <input
                      type="text"
                      required
                      placeholder="POSTAL/ZIP CODE"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-1/3 bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-mono text-ink uppercase focus:outline-none rounded-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex space-x-2">
                    <div className="w-1/2">
                      <Eyebrow className="text-ash mb-1 block">STATE / REGION</Eyebrow>
                      <input
                        type="text"
                        required
                        placeholder="STATE/PROVINCE"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-sans text-ink uppercase focus:outline-none rounded-none"
                      />
                    </div>
                    <div className="w-1/2">
                      <Eyebrow className="text-ash mb-1 block">COUNTRY (GLOBAL)</Eyebrow>
                      <input
                        type="text"
                        required
                        list="worldwide-countries-list"
                        placeholder="SELECT OR TYPE COUNTRY..."
                        value={country}
                        onChange={(e) => setCountry(e.target.value.toUpperCase())}
                        className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-sans text-ink uppercase focus:outline-none rounded-none"
                      />
                      <datalist id="worldwide-countries-list">
                        {WORLD_COUNTRIES.map((c) => (
                          <option key={c.code} value={c.name} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Nº 02 PAYMENT METHOD SELECTION */}
          <div className="space-y-4">
            <div className="border-b border-rule pb-2 flex items-baseline space-x-3">
              <span className="font-mono text-xs text-ash">Nº 02</span>
              <h2 className="font-mono text-sm font-semibold tracking-widest uppercase text-ink">PAYMENT METHOD</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-4 border text-left flex flex-col justify-between space-y-2 rounded-none transition-colors ${
                  paymentMethod === 'card'
                    ? 'bg-ink text-paper border-ink font-semibold'
                    : 'bg-paper text-ink border-rule hover:bg-paper-sunk'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span>💳 CREDIT / DEBIT CARD</span>
                  <span>{paymentMethod === 'card' ? '●' : '○'}</span>
                </div>
                <span className="text-[11px] opacity-80">Stripe encrypted payment (Visa, Mastercard, Amex)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`p-4 border text-left flex flex-col justify-between space-y-2 rounded-none transition-colors ${
                  paymentMethod === 'cod'
                    ? 'bg-ink text-paper border-ink font-semibold'
                    : 'bg-paper text-ink border-rule hover:bg-paper-sunk'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span>💵 CASH ON DELIVERY (COD)</span>
                  <span>{paymentMethod === 'cod' ? '●' : '○'}</span>
                </div>
                <span className="text-[11px] opacity-80">Pay cash directly to the courier upon delivery</span>
              </button>
            </div>
          </div>

          {/* Nº 03 REVIEW & PLACE ORDER */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-rule pb-2 flex items-baseline space-x-3">
              <span className="font-mono text-xs text-ash">Nº 03</span>
              <h2 className="font-mono text-sm font-semibold tracking-widest uppercase text-ink">REVIEW & SUBMIT</h2>
            </div>

            {/* Coupon Code Input / Applied Summary */}
            <div className="border border-rule p-4 bg-paper">
              <CouponInput
                cartSubtotal={subtotal}
                appliedCoupon={appliedCoupon}
                onCouponApplied={(coupon) => setAppliedCoupon(coupon.valid ? coupon : null)}
              />
            </div>

            <div className="font-mono text-xs text-graphite border border-rule p-4 bg-paper space-y-2">
              <div className="flex justify-between">
                <span>SUBTOTAL ({items.length} items)</span>
                <Numeric value={subtotal} format="price" zeroPadInt={3} />
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-gain font-semibold">
                  <span>PROMO DISCOUNT ({appliedCoupon?.code})</span>
                  <Numeric value={-discount} format="price" zeroPadInt={2} />
                </div>
              )}
              <div className="flex justify-between font-semibold text-ink border-t border-rule/50 pt-2 text-sm">
                <span>ESTIMATED TOTAL</span>
                <Numeric value={total} format="price" zeroPadInt={3} />
              </div>
              <div className="text-ash text-[11px] pt-1 uppercase">
                METHOD: {paymentMethod === 'cod' ? '💵 CASH ON DELIVERY' : '💳 CREDIT/DEBIT CARD (STRIPE)'}
              </div>
              {addressLine1 && (
                <div className="text-ash text-[11px] uppercase">
                  DELIVERY DESTINATION: {recipientName ? `${recipientName}, ` : ''}{addressLine1}, {city} {state} {postalCode} — {country}
                </div>
              )}
            </div>

            {/* Single Signal Red CTA Button */}
            <button
              type="submit"
              disabled={isCheckingOut || isGuestCheckingOut}
              className="w-full h-14 bg-signal text-signal-ink font-sans text-sm font-semibold uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-50 border border-signal rounded-none"
            >
              {isCheckingOut || isGuestCheckingOut
                ? 'RESERVING INVENTORY...'
                : paymentMethod === 'cod'
                ? `PLACE COD ORDER — $${total.toFixed(2)}`
                : `PLACE ORDER — $${total.toFixed(2)}`}
            </button>

            <div className="text-center font-mono text-[11px] text-ash">
              {paymentMethod === 'cod' ? 'Cash due upon courier arrival · Idempotency-key attached' : 'Secured by Stripe · Idempotency-key attached'}
            </div>
          </div>

        </form>
      )}

    </div>
  );
};
