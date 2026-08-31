import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { Order } from '../types/api';
import { StatusPill } from '../components/ui/StatusPill';
import { Money } from '../components/ui/Money';
import { Eyebrow } from '../components/ui/Eyebrow';
import { ShopifyOrdersBox } from '../components/ShopifyOrdersBox';
import { ChevronRight, Package, ArrowUpRight } from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const { orders, isLoading } = useOrders();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-raised rounded-card"></div>
        <div className="h-64 bg-surface border border-line rounded-card"></div>
      </div>
    );
  }

  const filteredOrders = filterStatus === 'ALL'
    ? orders
    : orders.filter((o) => o.status?.toUpperCase() === filterStatus);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-line pb-6 space-y-2">
        <Eyebrow className="text-amber block font-bold">TRANSACTIONAL LEDGER</Eyebrow>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-text tracking-tight">Orders</h1>
        <p className="font-mono text-xs text-text-mute">
          Live fulfillment state machine and event stream for all platform orders.
        </p>
      </div>

      {/* Shopify Multi-Channel Sync Box */}
      <ShopifyOrdersBox />

      {/* Filter Status Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Eyebrow className="text-text-mute mr-1">STATUS:</Eyebrow>
        {['ALL', 'PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 text-xs font-mono rounded-pill transition-colors ${
              filterStatus === s
                ? 'bg-amber text-on-amber font-bold'
                : 'bg-raised text-text-dim border border-line hover:border-line-strong'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Orders List / Table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-surface border border-line rounded-card p-12 text-center space-y-3 font-mono">
          <Package className="w-8 h-8 text-text-mute mx-auto" />
          <div className="text-text-dim text-sm font-semibold">NO ORDERS RECORDED</div>
          <p className="text-text-mute text-xs">No orders match your filter criteria.</p>
        </div>
      ) : (
        <div className="border border-line bg-surface rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="bg-raised border-b border-line text-text-mute">
                  <th className="py-3 px-4"><Eyebrow>ORDER ID</Eyebrow></th>
                  <th className="py-3 px-4"><Eyebrow>DATE</Eyebrow></th>
                  <th className="py-3 px-4"><Eyebrow>ITEMS</Eyebrow></th>
                  <th className="py-3 px-4"><Eyebrow>TOTAL</Eyebrow></th>
                  <th className="py-3 px-4"><Eyebrow>STATUS</Eyebrow></th>
                  <th className="py-3 px-4 text-right"><Eyebrow>TRACKING / ACTIONS</Eyebrow></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filteredOrders.map((order: Order) => {
                  const dateStr = order.created_at
                    ? new Date(order.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
                    : 'AUG 31 2026';
                  const itemCount = order.items?.length || 1;
                  const trackingNum = (order as any).tracking_number || `TRK-${order.id.slice(0, 8).toUpperCase()}-GL`;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-raised/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-text">
                        <Link to={`/orders/${order.id}`} className="hover:text-amber transition-colors flex items-center gap-1">
                          <span>#{order.id.slice(0, 8).toUpperCase()}</span>
                          <ArrowUpRight className="w-3 h-3 text-text-mute" />
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-text-mute">{dateStr}</td>
                      <td className="py-3.5 px-4 text-text-dim">
                        {String(itemCount).padStart(2, '0')} items
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-text">
                        <Money amount={Number(order.total_amount || 0)} size="inline" />
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusPill status={order.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/orders/${order.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-raised hover:bg-overlay border border-line rounded-card text-text-dim hover:text-text transition-colors"
                        >
                          <span className="text-[11px] font-mono">{trackingNum}</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
