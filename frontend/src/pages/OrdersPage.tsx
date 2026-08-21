import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { Order } from '../types/api';
import { StatusDot } from '../components/ui/StatusDot';
import { Numeric } from '../components/ui/Numeric';
import { Eyebrow } from '../components/ui/Eyebrow';
import { ShopifyOrdersBox } from '../components/ShopifyOrdersBox';

export const OrdersPage: React.FC = () => {
  const { orders, isLoading } = useOrders();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    setExpandedOrderId(prev => (prev === id ? null : id));
  };

  const getStepState = (status: string, targetStep: string) => {
    const steps = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'];
    const currentIdx = steps.indexOf(status.toUpperCase());
    const targetIdx = steps.indexOf(targetStep);

    if (currentIdx === -1) return 'future'; // Cancelled or unknown
    if (targetIdx <= currentIdx) return 'reached';
    return 'future';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-paper-sunk border border-rule"></div>
        <div className="h-64 bg-paper-sunk border border-rule"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-rule pb-4">
        <h1 className="font-serif text-[48px] text-ink font-normal leading-none">Order Ledger.</h1>
        <p className="font-mono text-xs text-ash mt-1">Real-time fulfillment tracking and transactional outbox stream logs.</p>
      </div>

      {/* Dedicated Shopify Sales Channel Box */}
      <ShopifyOrdersBox />

      {/* Dense Table Layout */}
      <div className="border border-rule bg-paper overflow-x-auto">
        <table className="min-w-[640px] w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="bg-paper-sunk border-b border-rule text-ash">
              <th className="py-3 px-4"><Eyebrow>ORD Nº</Eyebrow></th>
              <th className="py-3 px-4"><Eyebrow>DATE</Eyebrow></th>
              <th className="py-3 px-4"><Eyebrow>ITEMS</Eyebrow></th>
              <th className="py-3 px-4"><Eyebrow>TOTAL</Eyebrow></th>
              <th className="py-3 px-4"><Eyebrow>STATUS</Eyebrow></th>
              <th className="py-3 px-4 text-right"><Eyebrow>TRACKING</Eyebrow></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule/50">
            {orders.map((order: Order) => {
              const isExpanded = expandedOrderId === order.id;
              const dateStr = order.created_at
                ? new Date(order.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
                : '27 JUL 2026';
              const itemCount = order.items?.length || 1;
              const trackingNum = (order as any).tracking_number || `TRK-${order.id.slice(0, 8).toUpperCase()}-GLOBAL`;

              return (
                <React.Fragment key={order.id}>
                  <tr
                    onClick={() => toggleAccordion(order.id)}
                    className="hover:bg-paper-sunk/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold text-ink">
                      ORD-{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-3.5 px-4 text-ash">{dateStr}</td>
                    <td className="py-3.5 px-4 text-ink">
                      <Numeric value={itemCount} format="integer" zeroPadInt={2} />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-ink">
                      <Numeric value={Number(order.total_amount || 0)} format="price" zeroPadInt={3} />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center space-x-1.5 font-semibold">
                        <StatusDot status={order.status} />
                        <span className="uppercase text-ink">{order.status}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right text-ash">
                      {trackingNum}
                    </td>
                  </tr>

                  {/* Expanded Accordion Panel */}
                  {isExpanded && (
                    <tr className="bg-paper-sunk border-b border-rule">
                      <td colSpan={6} className="p-4 sm:p-6 space-y-6">
                        <div className="space-y-1">
                          <Eyebrow className="text-ash block">ORDERED PRODUCTS</Eyebrow>
                          <div className="space-y-1.5 font-sans text-sm font-medium text-ink">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-paper p-2.5 border border-rule gap-1">
                                  <span>{item.product_name || `Product #${item.product_id}`}</span>
                                  <span className="font-mono text-xs text-ash">QTY: {item.quantity} × ${Number(item.unit_price || 0).toFixed(2)}</span>
                                </div>
                              ))
                            ) : (
                              <div className="bg-paper p-2.5 border border-rule font-sans text-sm">
                                {order.product_name || 'Flash Sale Product'}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Eyebrow className="text-ash block">FULFILLMENT LIFECYCLE TIMELINE</Eyebrow>

                          {/* Horizontal Stepper */}
                          <div className="flex items-center space-x-2 font-mono text-xs pt-2 overflow-x-auto pb-1">
                            {['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'].map((step, idx, arr) => {
                              const state = getStepState(order.status, step);
                              const isReached = state === 'reached';

                              return (
                                <React.Fragment key={step}>
                                  <div
                                    className={`px-3 py-1.5 border border-rule whitespace-nowrap ${
                                      isReached ? 'bg-ink text-paper font-semibold' : 'bg-paper text-ash'
                                    }`}
                                  >
                                    [ {step} ]
                                  </div>
                                  {idx < arr.length - 1 && (
                                    <span className="text-rule flex-shrink-0">───</span>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>

                        {/* Order Details Link & Meta */}
                        <div className="flex justify-between items-center pt-2 border-t border-rule/40 font-mono text-xs">
                          <div className="text-ash">
                            FULL ORDER UUID: <span className="text-ink">{order.id}</span>
                          </div>
                          <Link
                            to={`/orders/${order.id}`}
                            className="bg-ink text-paper px-4 py-1.5 hover:bg-graphite text-xs uppercase"
                          >
                            VIEW FULL RECEIPT & CANCEL →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
