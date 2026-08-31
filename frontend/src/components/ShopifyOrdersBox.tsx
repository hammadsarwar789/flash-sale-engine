import React, { useEffect, useState } from 'react';
import { ordersApi } from '../api/orders';
import { Eyebrow } from './ui/Eyebrow';
import { Money } from './ui/Money';
import { StatusPill } from './ui/StatusPill';
import { RefreshCw, ShoppingCart } from 'lucide-react';

interface Order {
  id: string;
  shopify_order_number?: string;
  shopify_order_id?: string;
  origin_source?: string;
  source?: string;
  status: string;
  total_amount: string | number;
  created_at?: string;
  user_email?: string;
}

export const ShopifyOrdersBox: React.FC = () => {
  const [shopifyOrders, setShopifyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShopifyOrders = () => {
    setLoading(true);
    ordersApi.listUserOrders('SHOPIFY')
      .then((data) => {
        setShopifyOrders(data as Order[]);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch Shopify orders:', err);
        setError('Could not load Shopify channel orders');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchShopifyOrders();
  }, []);

  return (
    <div className="bg-surface border border-line rounded-card p-6 space-y-4 mb-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <ShoppingCart className="w-5 h-5 text-amber" />
          <div>
            <Eyebrow className="text-text-mute block">OMNI-CHANNEL INTEGRATION</Eyebrow>
            <h3 className="font-display text-base font-bold text-text">
              Shopify Sales Channel Stream
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-sky-soft border border-sky/30 text-sky px-2.5 py-1 rounded-pill font-semibold">
            {shopifyOrders.length} Synchronized Orders
          </span>
          <button
            onClick={fetchShopifyOrders}
            className="flex items-center gap-1 bg-raised hover:bg-overlay border border-line text-text-dim hover:text-text px-2.5 py-1 rounded-card text-xs font-mono transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {loading ? (
        <p className="font-mono text-xs text-text-mute">Polling Shopify webhook channel...</p>
      ) : error ? (
        <p className="font-mono text-xs text-rose">{error}</p>
      ) : shopifyOrders.length === 0 ? (
        <div className="p-6 text-center bg-raised rounded-card border border-dashed border-line">
          <p className="text-text-mute text-xs font-mono">
            No orders received from Shopify yet. Real-time webhooks will automatically push sales here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-line rounded-card">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-raised border-b border-line text-text-mute">
                <th className="py-2.5 px-3.5"><Eyebrow>SHOPIFY ORDER #</Eyebrow></th>
                <th className="py-2.5 px-3.5"><Eyebrow>CUSTOMER</Eyebrow></th>
                <th className="py-2.5 px-3.5"><Eyebrow>STATUS</Eyebrow></th>
                <th className="py-2.5 px-3.5 text-right"><Eyebrow>AMOUNT</Eyebrow></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shopifyOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-raised/40 transition-colors">
                  <td className="py-2.5 px-3.5 font-bold text-text">
                    {ord.shopify_order_number || `#SH-${ord.shopify_order_id || ord.id.slice(0, 8)}`}
                  </td>
                  <td className="py-2.5 px-3.5 text-text-dim">
                    {ord.user_email || 'Shopify Customer'}
                  </td>
                  <td className="py-2.5 px-3.5">
                    <StatusPill status={ord.status} size="sm" />
                  </td>
                  <td className="py-2.5 px-3.5 text-right">
                    <Money amount={Number(ord.total_amount || 0)} size="inline" className="font-bold text-text" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
