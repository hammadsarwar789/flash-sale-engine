import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOrderDetail, useOrders } from '../hooks/useOrders';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Numeric } from '../components/ui/Numeric';
import { StatusDot } from '../components/ui/StatusDot';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading, isError, refetch } = useOrderDetail(id);
  const { cancelOrder, isCancellingOrder } = useOrders();

  const [cancelNotice, setCancelNotice] = useState<string | null>(null);

  const handleCancelOrder = async () => {
    if (!id) return;
    try {
      await cancelOrder(id);
      setCancelNotice('Order cancelled. Reserved inventory returned to floor pool.');
      refetch();
    } catch (err: any) {
      setCancelNotice(err.message || 'Failed to cancel order reservation.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-paper-sunk border border-rule"></div>
        <div className="h-44 bg-paper-sunk border border-rule"></div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4 border border-loss bg-paper">
        <h2 className="font-serif text-3xl text-ink">Order Not Found</h2>
        <p className="font-mono text-xs text-ash">Order Record #{id} could not be located on floor ledger.</p>
        <Link to="/orders" className="inline-block bg-ink text-paper font-mono text-xs uppercase px-6 py-2">
          ← Back to Order Ledger
        </Link>
      </div>
    );
  }

  const isPending = order.status === 'PENDING';

  const getStepState = (status: string, targetStep: string) => {
    const steps = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'];
    const currentIdx = steps.indexOf(status.toUpperCase());
    const targetIdx = steps.indexOf(targetStep);

    if (currentIdx === -1) return 'future';
    if (targetIdx <= currentIdx) return 'reached';
    return 'future';
  };

  return (
    <div className="space-y-8">
      
      {/* Top Header */}
      <div className="border-b border-rule pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <Link to="/orders" className="font-mono text-xs text-ash hover:text-ink block">
            ← BACK TO ORDER LEDGER
          </Link>
          <h1 className="font-serif text-[42px] sm:text-[56px] text-ink font-normal leading-none mt-1">
            Order #{order.id.slice(0, 12)}
          </h1>
          <div className="font-mono text-xs text-ash mt-1">
            RECORDED ON {order.created_at ? new Date(order.created_at).toUTCString().toUpperCase() : 'N/A'}
          </div>
        </div>

        {/* Cancel Button */}
        {isPending && (
          <button
            onClick={handleCancelOrder}
            disabled={isCancellingOrder}
            className="font-mono text-xs text-loss hover:underline uppercase"
          >
            {isCancellingOrder ? '[ CANCELING... ]' : '[ CANCEL RESERVATION ]'}
          </button>
        )}
      </div>

      {cancelNotice && (
        <div className="p-3 border border-gain bg-paper text-gain font-mono text-xs">
          {cancelNotice}
        </div>
      )}

      {/* Fulfillment Stepper Component */}
      <div className="border border-rule p-6 bg-paper space-y-4">
        <Eyebrow className="text-ash block">FULFILLMENT TIMELINE</Eyebrow>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'].map((step, idx, arr) => {
            const state = getStepState(order.status, step);
            const isReached = state === 'reached';

            return (
              <React.Fragment key={step}>
                <div
                  className={`px-3 py-1.5 border border-rule ${
                    isReached ? 'bg-ink text-paper font-semibold' : 'bg-paper text-ash'
                  }`}
                >
                  [ {step} ]
                </div>
                {idx < arr.length - 1 && (
                  <span className="text-rule">───</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Line Items & Shipping Meta Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <div className="lg:col-span-8 border border-rule p-6 bg-paper space-y-4">
          <Eyebrow className="text-ash block border-b border-rule pb-3">RESERVED LINE ITEMS</Eyebrow>
          
          <div className="divide-y divide-rule font-mono text-xs">
            {order.items?.map((item: any) => (
              <div key={item.id} className="py-3 flex justify-between items-center">
                <div className="space-y-1">
                  <p className="font-sans font-medium text-sm text-ink">{item.product_name || `Product #${item.product_id}`}</p>
                  <p className="text-ash">QTY <Numeric value={item.quantity} format="integer" zeroPadInt={2} /> × <Numeric value={Number(item.unit_price || 0)} format="price" zeroPadInt={3} /></p>
                </div>
                <Numeric value={Number(item.subtotal || 0)} format="price" zeroPadInt={3} className="font-semibold text-ink" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="border border-rule p-6 bg-paper space-y-3 font-mono text-xs">
            <Eyebrow className="text-ash block border-b border-rule pb-2">SHIPPING DESTINATION</Eyebrow>
            {order.shipping_address ? (
              <div className="space-y-1 text-graphite">
                <p className="font-semibold text-ink">{order.shipping_address.recipient_name}</p>
                <p>{order.shipping_address.address_line1}</p>
                <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
                <p className="text-ash">{order.shipping_address.country}</p>
              </div>
            ) : (
              <p className="text-ash">STANDARD EXPRESS SHIPPING</p>
            )}
          </div>

          <div className="border border-rule p-6 bg-paper space-y-3 font-mono text-xs">
            <Eyebrow className="text-ash block border-b border-rule pb-2">RECEIPT SUMMARY</Eyebrow>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-ash">SUBTOTAL</span>
                <Numeric value={Number((order.total_amount || 0) - (order.tax_amount || 0))} format="price" zeroPadInt={3} />
              </div>
              <div className="flex justify-between">
                <span className="text-ash">TAX</span>
                <Numeric value={Number(order.tax_amount || 0)} format="price" zeroPadInt={3} />
              </div>
              <div className="flex justify-between pt-2 border-t border-rule font-semibold text-ink text-sm">
                <span>TOTAL</span>
                <Numeric value={Number(order.total_amount || 0)} format="price" zeroPadInt={3} />
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
