import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOrderDetail, useOrders } from '../hooks/useOrders';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Money } from '../components/ui/Money';
import { StatusPill } from '../components/ui/StatusPill';
import { ChevronLeft, Copy, Check, Truck, MapPin, AlertTriangle } from 'lucide-react';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, isError, refetch } = useOrderDetail(id);
  const { cancelOrder, isCancellingOrder } = useOrders();

  const [cancelNotice, setCancelNotice] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  const handleCancelOrder = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to cancel this order reservation?')) return;
    try {
      await cancelOrder(id);
      setCancelNotice('Order reservation cancelled. Inventory returned to floor pool.');
      refetch();
    } catch (err: any) {
      setCancelNotice(err.message || 'Failed to cancel order reservation.');
    }
  };

  const copyTrackingNumber = (trk: string) => {
    navigator.clipboard.writeText(trk);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-raised rounded-card"></div>
        <div className="h-44 bg-surface border border-line rounded-card"></div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4 border border-rose/40 bg-surface rounded-card p-8">
        <h2 className="font-display text-2xl font-bold text-text">Order Not Located</h2>
        <p className="font-mono text-xs text-text-mute">Order Record #{id} was not found on the platform ledger.</p>
        <Link
          to="/orders"
          className="inline-block bg-amber text-on-amber font-sans font-semibold text-xs uppercase px-6 py-2.5 rounded-card hover:bg-amber-press transition-colors"
        >
          ← Back to Orders
        </Link>
      </div>
    );
  }

  const status = (order.status || 'PENDING').toUpperCase();
  const isPending = status === 'PENDING';
  const isCancelled = status === 'CANCELLED' || status === 'REFUNDED';
  const trackingNumber = (order as any).tracking_number || `TRK-${order.id.slice(0, 8).toUpperCase()}-GL`;
  const carrier = (order as any).carrier || 'FEDEX EXPRESS GLOBAL';

  const steps = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'];
  const currentStepIndex = steps.indexOf(status);

  return (
    <div className="space-y-8 max-w-[960px] mx-auto">
      
      {/* Top Header */}
      <div className="border-b border-line pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <Link to="/orders" className="font-mono text-xs text-text-mute hover:text-text flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>BACK TO ORDERS</span>
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-text tracking-tight">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <StatusPill status={status} />
          </div>
          <div className="font-mono text-xs text-text-mute mt-1">
            Placed on {order.created_at ? new Date(order.created_at).toUTCString().toUpperCase() : 'N/A'}
          </div>
        </div>

        {/* Cancel Button */}
        {isPending && (
          <button
            onClick={handleCancelOrder}
            disabled={isCancellingOrder}
            className="px-4 py-2 bg-raised border border-rose/30 text-rose hover:bg-rose-soft font-mono text-xs font-semibold uppercase rounded-card transition-colors"
          >
            {isCancellingOrder ? 'CANCELLING RESERVATION...' : 'CANCEL ORDER'}
          </button>
        )}
      </div>

      {cancelNotice && (
        <div className="p-3.5 border border-mint/40 bg-mint-soft text-mint font-mono text-xs rounded-card">
          ● {cancelNotice}
        </div>
      )}

      {/* Fulfillment Milestone Rail */}
      <div className="bg-surface border border-line rounded-card p-6 sm:p-8 space-y-6">
        <Eyebrow className="text-text-mute block">FULFILLMENT TIMELINE</Eyebrow>

        {isCancelled ? (
          <div className="p-4 bg-rose-soft border border-rose/40 text-rose rounded-card flex items-center gap-3 font-mono text-xs">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>This order reservation was {status}. Funds have been refunded and inventory returned to the floor pool.</span>
          </div>
        ) : (
          <div className="py-4">
            {/* Desktop Milestone Bar */}
            <div className="grid grid-cols-4 relative">
              {/* Connecting Bar */}
              <div className="absolute top-3.5 left-6 right-6 h-0.5 bg-line z-0" />

              {steps.map((step, idx) => {
                const isPassed = currentStepIndex > idx;
                const isCurrent = currentStepIndex === idx;

                let nodeStyle = 'bg-surface border-2 border-line text-text-mute';
                let labelStyle = 'text-text-mute';

                if (isPassed) {
                  nodeStyle = 'bg-mint border-2 border-mint text-on-amber font-bold';
                  labelStyle = 'text-mint font-semibold';
                } else if (isCurrent) {
                  nodeStyle = 'bg-amber border-2 border-amber ring-4 ring-amber/20 text-on-amber font-bold animate-signal-pulse';
                  labelStyle = 'text-amber font-bold';
                }

                return (
                  <div key={step} className="flex flex-col items-center text-center relative z-10 space-y-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono transition-all ${nodeStyle}`}>
                      {isPassed ? '✓' : idx + 1}
                    </div>
                    <span className={`font-mono text-[11px] uppercase tracking-wider ${labelStyle}`}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tracking Card & Shipping Address */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        
        {/* Tracking Card */}
        <div className="bg-surface border border-line rounded-card p-6 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-text">
            <Truck className="w-4 h-4 text-sky" />
            <Eyebrow className="text-text-mute">COURIER DISPATCH</Eyebrow>
          </div>
          <div>
            <span className="text-text-mute block text-[11px]">CARRIER</span>
            <span className="text-text font-semibold">{carrier}</span>
          </div>
          <div>
            <span className="text-text-mute block text-[11px]">TRACKING ID</span>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-text font-bold text-sm bg-raised px-2.5 py-1 rounded border border-line">
                {trackingNumber}
              </span>
              <button
                onClick={() => copyTrackingNumber(trackingNumber)}
                className="p-1.5 bg-raised hover:bg-overlay border border-line rounded text-text-dim hover:text-text transition-colors"
                title="Copy tracking code"
              >
                {copiedTracking ? <Check className="w-4 h-4 text-mint" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-surface border border-line rounded-card p-6 space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-text">
            <MapPin className="w-4 h-4 text-amber" />
            <Eyebrow className="text-text-mute">DESTINATION ADDRESS</Eyebrow>
          </div>
          <div className="text-text font-sans">
            <p className="font-semibold text-text">{order.shipping_address?.recipient_name || 'Customer'}</p>
            <p className="text-text-dim">{order.shipping_address?.address_line1 || '100 Wall Street, Suite 400'}</p>
            <p className="text-text-mute">
              {order.shipping_address?.city || 'New York'}, {order.shipping_address?.state || 'NY'} {order.shipping_address?.postal_code || '10005'} — {order.shipping_address?.country || 'USA'}
            </p>
            {order.shipping_address?.phone && (
              <p className="text-text-mute font-mono pt-1">TEL: {order.shipping_address.phone}</p>
            )}
          </div>
        </div>

      </div>

      {/* Itemized Line Items Table */}
      <div className="bg-surface border border-line rounded-card p-6 sm:p-8 space-y-4">
        <Eyebrow className="text-text-mute block">ITEMIZED RECEIPT</Eyebrow>

        <div className="divide-y divide-line">
          {(order.items || []).map((item: any, idx: number) => (
            <div key={idx} className="py-3.5 flex items-center justify-between font-mono text-xs">
              <div className="space-y-0.5">
                <span className="font-sans text-sm font-medium text-text block">
                  {item.product?.name || `Product #${item.product_id}`}
                </span>
                <span className="text-text-mute text-[11px]">
                  {[item.variant?.color, item.variant?.size].filter(Boolean).join(' · ') || 'STANDARD'} · QTY {item.quantity}
                </span>
              </div>
              <Money amount={item.subtotal || (item.unit_price * item.quantity)} size="inline" className="font-semibold text-text" />
            </div>
          ))}
        </div>

        {/* Totals Breakdown */}
        <div className="border-t border-line pt-4 space-y-2 font-mono text-xs">
          <div className="flex justify-between text-text-dim">
            <span>SUBTOTAL</span>
            <Money amount={Number(order.total_amount || 0)} size="inline" />
          </div>
          <div className="flex justify-between text-text-dim">
            <span>SHIPPING</span>
            <span className="text-mint font-semibold">FREE INCLUDED</span>
          </div>
          <div className="border-t border-line pt-3 flex justify-between text-text text-sm font-bold">
            <span>TOTAL CHARGED</span>
            <Money amount={Number(order.total_amount || 0)} size="lg" />
          </div>
        </div>
      </div>

    </div>
  );
};
