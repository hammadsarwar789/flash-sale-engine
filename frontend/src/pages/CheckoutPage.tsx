import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../hooks/useCart';
import { useOrders } from '../hooks/useOrders';
import { commerceApi } from '../api/commerce';
import { StripeCardForm } from '../components/checkout/StripeCardForm';
import { ShippingAddress, Order, CartItem } from '../types/api';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Numeric } from '../components/ui/Numeric';

export const CheckoutPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { cart } = useCart();
  const { checkout, guestCheckout, isCheckingOut, isGuestCheckingOut } = useOrders();
  const navigate = useNavigate();

  const [isGuestMode, setIsGuestMode] = useState(!isAuthenticated);
  const [guestEmail, setGuestEmail] = useState('');
  
  // Shipping Address state
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState(user?.full_name || '');
  const [addressLine1, setAddressLine1] = useState('123 Tech Way');
  const [city, setCity] = useState('San Francisco');
  const [state, setState] = useState('CA');
  const [postalCode, setPostalCode] = useState('94105');
  const [country, setCountry] = useState('US');

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isPaymentCompleted, setIsPaymentCompleted] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      commerceApi.listShippingAddresses().then((addrs) => {
        setShippingAddresses(addrs);
        if (addrs.length > 0 && addrs[0].id) {
          setSelectedAddressId(addrs[0].id);
        }
      }).catch((e) => console.warn('Could not load shipping addresses', e));
    }
  }, [isAuthenticated]);

  const items = cart?.items || [];
  const subtotal = cart?.subtotal || 0;
  const total = subtotal;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    const idempotencyKey = crypto.randomUUID();

    try {
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
        });
        setCreatedOrder(res.order);
      } else {
        if (!selectedAddressId && addressLine1) {
          await commerceApi.createShippingAddress({
            recipient_name: recipientName || user?.full_name || 'Customer',
            address_line1: addressLine1,
            city: city || 'City',
            state: state || 'State',
            postal_code: postalCode || '12345',
            country: country || 'US',
          });
        }
        const res = await checkout(idempotencyKey);
        setCreatedOrder(res.order);
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'Order reservation failed.');
    }
  };

  const handlePaymentCompleted = (paymentId: string) => {
    setIsPaymentCompleted(true);
    if (createdOrder?.id) {
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
          IDEMPOTENCY GUARANTEED
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

          {!isPaymentCompleted ? (
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
                <h2 className="font-mono text-sm font-semibold tracking-widest uppercase text-ink">SHIPPING</h2>
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

            {/* Address Input Fields */}
            <div className="space-y-4 pt-2">
              <div>
                <Eyebrow className="text-ash mb-1 block">FULL NAME</Eyebrow>
                <input
                  type="text"
                  required
                  placeholder="JOHN DOE"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-sans text-ink uppercase focus:outline-none rounded-none"
                />
              </div>

              <div>
                <Eyebrow className="text-ash mb-1 block">STREET ADDRESS</Eyebrow>
                <input
                  type="text"
                  required
                  placeholder="123 TECH WAY"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-sans text-ink uppercase focus:outline-none rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Eyebrow className="text-ash mb-1 block">CITY / ZIP</Eyebrow>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      required
                      placeholder="SAN FRANCISCO"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-2/3 bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-sans text-ink uppercase focus:outline-none rounded-none"
                    />
                    <input
                      type="text"
                      required
                      placeholder="94105"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-1/3 bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-mono text-ink focus:outline-none rounded-none"
                    />
                  </div>
                </div>

                <div>
                  <Eyebrow className="text-ash mb-1 block">COUNTRY</Eyebrow>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-paper-sunk border-0 border-b-2 border-rule focus:border-ink px-3 py-2.5 text-sm font-mono text-ink focus:outline-none rounded-none"
                  >
                    <option value="US">UNITED STATES ▾</option>
                    <option value="CA">CANADA ▾</option>
                    <option value="UK">UNITED KINGDOM ▾</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Nº 02 PAYMENT (Stripe Preview) */}
          <div className="space-y-4">
            <div className="border-b border-rule pb-2 flex items-baseline space-x-3">
              <span className="font-mono text-xs text-ash">Nº 02</span>
              <h2 className="font-mono text-sm font-semibold tracking-widest uppercase text-ink">PAYMENT</h2>
            </div>

            <div className="border border-rule p-4 bg-paper-sunk font-mono text-xs text-ash space-y-1">
              <p>💳 STRIPE CARD ELEMENTS ATTACHED</p>
              <p>Encryption: 256-bit SSL · Idempotency-Key UUID v4 attached on submission</p>
            </div>
          </div>

          {/* Nº 03 REVIEW & PLACE ORDER */}
          <div className="space-y-4 pt-2">
            <div className="border-b border-rule pb-2 flex items-baseline space-x-3">
              <span className="font-mono text-xs text-ash">Nº 03</span>
              <h2 className="font-mono text-sm font-semibold tracking-widest uppercase text-ink">REVIEW & SUBMIT</h2>
            </div>

            <div className="font-mono text-xs text-graphite border border-rule p-4 bg-paper space-y-2">
              <p>{items.length} items reserved · <Numeric value={total} format="price" zeroPadInt={3} /> total · ship to {addressLine1}, {city}</p>
            </div>

            {/* Single Signal Red CTA Button */}
            <button
              type="submit"
              disabled={isCheckingOut || isGuestCheckingOut}
              className="w-full h-14 bg-signal text-signal-ink font-sans text-sm font-semibold uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-50 border border-signal rounded-none"
            >
              {isCheckingOut || isGuestCheckingOut ? 'RESERVING INVENTORY...' : `PLACE ORDER — $${total.toFixed(2)}`}
            </button>

            <div className="text-center font-mono text-[11px] text-ash">
              Secured by Stripe · idempotency-key attached
            </div>
          </div>

        </form>
      )}

    </div>
  );
};
