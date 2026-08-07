import React, { useEffect, useState } from 'react';
import { ordersApi } from '../api/orders';

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
    const token = localStorage.getItem('token');
    fetch('/api/v1/orders?origin_source=SHOPIFY', {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const orderList = Array.isArray(data) ? data : (data.orders || []);
        setShopifyOrders(orderList);
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
    <div style={{ border: '1px solid #e5e7eb', padding: '20px', background: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>🛍️</span>
          <h3 style={{ margin: 0, fontSize: '15px', fontFamily: 'monospace', fontWeight: 700, color: '#111827', letterSpacing: '0.05em' }}>
            SHOPIFY SALES CHANNEL ORDERS
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, fontFamily: 'monospace' }}>
            {shopifyOrders.length} Direct Syncs
          </span>
          <button
            onClick={fetchShopifyOrders}
            style={{ background: '#f3f4f6', border: '1px solid #d1d5db', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace' }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#6b7280' }}>Loading Shopify channel telemetry...</p>
      ) : error ? (
        <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#ef4444' }}>{error}</p>
      ) : shopifyOrders.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', background: '#f9fafb', borderRadius: '6px', border: '1px dashed #d1d5db' }}>
          <p style={{ color: '#6b7280', fontSize: '13px', margin: 0, fontFamily: 'monospace' }}>
            No orders received from Shopify yet. Inbound webhooks will stream orders here in real time.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'monospace' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', color: '#4b5563' }}>
                <th style={{ padding: '10px' }}>Shopify Order #</th>
                <th style={{ padding: '10px' }}>Customer</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {shopifyOrders.map((ord) => (
                <tr key={ord.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px', fontWeight: 700, color: '#111827' }}>
                    {ord.shopify_order_number || `#SH-${ord.shopify_order_id || ord.id.slice(0, 8)}`}
                  </td>
                  <td style={{ padding: '10px', color: '#4b5563' }}>
                    {ord.user_email || 'Shopify Customer'}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      color: ord.status === 'PAID' ? '#059669' : (ord.status === 'CANCELLED' ? '#dc2626' : '#d97706'),
                      fontWeight: 600
                    }}>
                      ● {ord.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                    ${typeof ord.total_amount === 'number' ? ord.total_amount.toFixed(2) : parseFloat(ord.total_amount || '0').toFixed(2)}
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
