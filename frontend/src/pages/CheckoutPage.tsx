import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../hooks/useCart';
import { useOrders } from '../hooks/useOrders';
import { commerceApi } from '../api/commerce';
import { StripeCardForm } from '../components/checkout/StripeCardForm';
import { ShippingAddress, Order, CartItem } from '../types/api';
import { ShieldCheck, UserCheck, Mail, MapPin, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { cart } = useCart();
  const { checkout, guestCheckout, isCheckingOut, isGuestCheckingOut } = useOrders();
  const navigate = useNavigate();
  const location = useLocation();

  const [isGuestMode, setIsGuestMode] = useState(!isAuthenticated);
  const [guestEmail, setGuestEmail] = useState('');
  
  // Shipping Address state
  const [shippingAddresses, setShippingAddresses] = useState<ShippingAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState(user?.full_name || '');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');
  const [phone, setPhone] = useState('');

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isPaymentCompleted, setIsPaymentCompleted] = useState(false);

  // Load saved shipping addresses if authenticated
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
  const estimatedTax = Math.round(subtotal * 0.08 * 100) / 100;
  const total = subtotal + estimatedTax;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    // Generate Idempotency Key UUID v4 per checkout attempt
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
        // Save shipping address if user filled custom fields
        if (!selectedAddressId && addressLine1) {
          await commerceApi.createShippingAddress({
            recipient_name: recipientName || user?.full_name || 'Customer',
            address_line1: addressLine1,
            address_line2: addressLine2,
            city: city || 'City',
            state: state || 'State',
            postal_code: postalCode || '12345',
            country: country || 'US',
            phone,
          });
        }
        const res = await checkout(idempotencyKey);
        setCreatedOrder(res.order);
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'Order checkout failed. Please check stock availability or try again.');
    }
  };

  const handlePaymentCompleted = (paymentId: string) => {
    setIsPaymentCompleted(true);
    if (createdOrder?.id) {
      setTimeout(() => {
        navigate(`/orders/${createdOrder.id}`);
      }, 1500);
    }
  };

  if (items.length === 0 && !createdOrder) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4 glass-card rounded-3xl p-8 border border-slate-800">
        <h2 className="text-xl font-bold text-white">Cart is empty</h2>
        <p className="text-slate-400 text-sm">Please add items to your cart before proceeding to checkout.</p>
        <button onClick={() => navigate('/products')} className="bg-cyan-500 font-bold px-6 py-2 rounded-xl text-slate-950">
          Go to Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/cart')} className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-400 hover:text-cyan-400">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Cart</span>
          </button>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Checkout & Reservation</h1>
        </div>
        <div className="flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Idempotent Guard Active</span>
        </div>
      </div>

      {checkoutError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-bold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{checkoutError}</span>
        </div>
      )}

      {/* Success View */}
      {createdOrder && (
        <div className="p-8 rounded-3xl glass-card border border-emerald-500/30 text-center space-y-6 animate-fadeIn">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Order Reservation Accepted!</h2>
            <p className="text-slate-300 text-sm font-mono">Order ID: #{createdOrder.id}</p>
            <p className="text-slate-400 text-xs">
              Status: <span className="text-cyan-400 font-bold">{createdOrder.status || 'PENDING'}</span>
            </p>
          </div>

          {!isPaymentCompleted ? (
            <div className="max-w-md mx-auto pt-4">
              <StripeCardForm
                amount={createdOrder.total_amount || total}
                isProcessing={false}
                onPaymentSuccess={handlePaymentCompleted}
              />
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-300 font-bold text-sm">
              Payment confirmed! Redirecting to order detail timeline...
            </div>
          )}
        </div>
      )}

      {/* Checkout Form Grid */}
      {!createdOrder && (
        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Account & Shipping Address */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Guest / User Auth Toggle */}
            <div className="p-6 rounded-2xl glass-card border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-white flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-cyan-400" />
                  <span>Contact Information</span>
                </h3>
                {!isAuthenticated && (
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isGuestMode}
                      onChange={(e) => setIsGuestMode(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <span>Checkout as Guest</span>
                  </label>
                )}
              </div>

              {isGuestMode ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Guest Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="guest@example.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">{user?.email}</span>
                  <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full">Logged In</span>
                </div>
              )}
            </div>

            {/* Shipping Address Section */}
            <div className="p-6 rounded-2xl glass-card border border-slate-800 space-y-4">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <span>Shipping Address</span>
              </h3>

              {/* Saved Addresses Selector */}
              {shippingAddresses.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Select Saved Address
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {shippingAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => setSelectedAddressId(addr.id || null)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          selectedAddressId === addr.id
                            ? 'bg-cyan-500/10 border-cyan-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <p className="font-bold text-sm text-white">{addr.recipient_name}</p>
                        <p className="text-xs text-slate-300">{addr.address_line1}</p>
                        <p className="text-xs text-slate-400">{addr.city}, {addr.state} {addr.postal_code}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Address Input Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Recipient Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Address Line 1</label>
                  <input
                    type="text"
                    required
                    placeholder="123 Market Street"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">City</label>
                  <input
                    type="text"
                    required
                    placeholder="San Francisco"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">State / Postal Code</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      required
                      placeholder="CA"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-1/2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                    <input
                      type="text"
                      required
                      placeholder="94103"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-1/2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Order Review & Place Order Button */}
          <div className="space-y-6">
            <div className="p-6 rounded-2xl glass-card border border-slate-800 space-y-4">
              <h3 className="font-extrabold text-base text-white border-b border-slate-800 pb-3">
                Order Review ({items.length} items)
              </h3>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {items.map((i: CartItem) => (
                  <div key={i.id} className="flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-200 line-clamp-1">{i.product?.name || `Product #${i.product_id}`}</p>
                      {i.variant && <p className="text-slate-400">Variant: {i.variant.name}</p>}
                      <p className="text-slate-500">Qty: {i.quantity}</p>
                    </div>
                    <span className="font-bold text-white">${((i.unit_price || i.product?.price || 0) * i.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-200">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Tax</span>
                  <span className="font-bold text-slate-200">${estimatedTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800">
                  <span>Total Amount</span>
                  <span className="text-cyan-400">${total.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCheckingOut || isGuestCheckingOut}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-4 rounded-xl shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {isCheckingOut || isGuestCheckingOut ? 'Reserving Inventory...' : 'Confirm Order & Pay'}
              </button>
            </div>
          </div>

        </form>
      )}

    </div>
  );
};
