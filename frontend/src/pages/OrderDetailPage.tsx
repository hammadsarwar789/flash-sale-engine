import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useOrderDetail, useOrders } from '../hooks/useOrders';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Ban,
  AlertCircle,
  MapPin,
  CreditCard,
} from 'lucide-react';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, isError, refetch } = useOrderDetail(id);
  const { cancelOrder, isCancellingOrder } = useOrders();

  const [cancelNotice, setCancelNotice] = useState<string | null>(null);

  const handleCancelOrder = async () => {
    if (!id) return;
    try {
      await cancelOrder(id);
      setCancelNotice('Order cancelled and inventory successfully returned to pool.');
      refetch();
    } catch (err: any) {
      setCancelNotice(err.message || 'Failed to cancel order.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 space-y-6 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/4"></div>
        <div className="h-44 bg-slate-900 rounded-3xl"></div>
        <div className="h-64 bg-slate-900 rounded-3xl"></div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4 glass-card rounded-3xl p-8 border border-rose-500/30">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Order Not Found</h2>
        <p className="text-slate-400 text-sm">Could not find order details for ID #{id}</p>
        <Link to="/orders" className="inline-block bg-slate-800 text-cyan-400 font-bold px-6 py-2 rounded-xl">
          Back to Orders
        </Link>
      </div>
    );
  }

  const isPending = order.status === 'PENDING';
  const isPaid = order.status === 'PAID';
  const isShipped = order.status === 'SHIPPED';
  const isDelivered = order.status === 'DELIVERED';
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/orders" className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-400 hover:text-cyan-400">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Orders List</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Order #{order.id}</h1>
          <p className="text-xs text-slate-400">Placed on {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}</p>
        </div>

        {/* Cancel Button (valid while PENDING) */}
        {isPending && (
          <button
            onClick={handleCancelOrder}
            disabled={isCancellingOrder}
            className="flex items-center space-x-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors disabled:opacity-50"
          >
            <Ban className="w-4 h-4" />
            <span>{isCancellingOrder ? 'Cancelling...' : 'Cancel Order'}</span>
          </button>
        )}
      </div>

      {cancelNotice && (
        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>{cancelNotice}</span>
        </div>
      )}

      {/* Fulfillment Status Timeline */}
      <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
        <h3 className="font-extrabold text-sm text-slate-200 uppercase tracking-wider">Fulfillment Lifecycle</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className={`p-4 rounded-2xl border ${isPending || isPaid || isShipped || isDelivered ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
            <Clock className="w-6 h-6 mb-2" />
            <p className="font-bold text-xs">1. Reserved</p>
            <span className="text-[10px] block opacity-80">Stock Allocated</span>
          </div>
          <div className={`p-4 rounded-2xl border ${isPaid || isShipped || isDelivered ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
            <CreditCard className="w-6 h-6 mb-2" />
            <p className="font-bold text-xs">2. Payment</p>
            <span className="text-[10px] block opacity-80">{isPaid ? 'PAID' : 'Pending'}</span>
          </div>
          <div className={`p-4 rounded-2xl border ${isShipped || isDelivered ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
            <Truck className="w-6 h-6 mb-2" />
            <p className="font-bold text-xs">3. Shipping</p>
            <span className="text-[10px] block opacity-80">{isShipped ? 'En Route' : 'Processing'}</span>
          </div>
          <div className={`p-4 rounded-2xl border ${isDelivered ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : isCancelled ? 'bg-rose-500/10 border-rose-500/40 text-rose-400' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>
            {isCancelled ? <Ban className="w-6 h-6 mb-2" /> : <CheckCircle2 className="w-6 h-6 mb-2" />}
            <p className="font-bold text-xs">{isCancelled ? 'Cancelled' : '4. Delivered'}</p>
            <span className="text-[10px] block opacity-80">{isCancelled ? 'Inventory Released' : 'Completed'}</span>
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Line Items column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
            <h3 className="font-bold text-base text-white border-b border-slate-800 pb-3">Line Items</h3>
            
            <div className="space-y-4">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-white">{item.product_name || `Product #${item.product_id}`}</p>
                    <p className="text-xs text-slate-400">Qty: {item.quantity} × ${Number(item.unit_price || 0).toFixed(2)}</p>
                  </div>
                  <span className="font-extrabold text-sm text-cyan-400">${Number(item.subtotal || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Shipping & Payment Summary */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
            <h3 className="font-bold text-base text-white border-b border-slate-800 pb-3 flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span>Shipping Details</span>
            </h3>
            
            {order.shipping_address ? (
              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-bold text-white text-sm">{order.shipping_address.recipient_name}</p>
                <p>{order.shipping_address.address_line1}</p>
                {order.shipping_address.address_line2 && <p>{order.shipping_address.address_line2}</p>}
                <p>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</p>
                <p className="text-slate-400 font-mono pt-1">{order.shipping_address.phone}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Standard Express Postal Delivery</p>
            )}
          </div>

          <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-3">
            <h3 className="font-bold text-base text-white border-b border-slate-800 pb-3">Financial Total</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal</span>
                <span className="font-semibold text-white">${Number((order.total_amount || 0) - (order.tax_amount || 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Taxes</span>
                <span className="font-semibold text-white">${Number(order.tax_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-slate-800">
                <span>Total Amount</span>
                <span className="text-cyan-400">${Number(order.total_amount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
