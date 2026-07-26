import React from 'react';
import { Link } from 'react-router-dom';
import { useOrders } from '../hooks/useOrders';
import { Package, Calendar, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { OrderStatus } from '../types/api';

const getStatusBadge = (status: OrderStatus) => {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    case 'PAID':
      return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400';
    case 'SHIPPED':
      return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
    case 'DELIVERED':
      return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    case 'CANCELLED':
      return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
    default:
      return 'bg-slate-800 border-slate-700 text-slate-300';
  }
};

export const OrdersPage: React.FC = () => {
  const { orders, isLoading } = useOrders();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 space-y-4 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/4"></div>
        <div className="h-32 bg-slate-900 rounded-2xl"></div>
        <div className="h-32 bg-slate-900 rounded-2xl"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4 glass-card rounded-3xl p-8 border border-slate-800">
        <Package className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">No orders yet</h2>
        <p className="text-slate-400 text-sm">You haven't placed any orders with Flash Engine yet.</p>
        <Link to="/products" className="inline-block bg-cyan-500 font-bold px-6 py-2.5 rounded-xl text-slate-950">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Order History</h1>
        <p className="text-slate-400 text-sm">Track fulfillment status and view line items for past purchases.</p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            to={`/orders/${order.id}`}
            className="block p-6 rounded-2xl glass-card border border-slate-800 hover:border-cyan-500/50 transition-all hover:-translate-y-1 group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-bold text-white text-base">#{order.id.substring(0, 13)}...</span>
                  <span className={`text-xs font-bold px-3 py-0.5 rounded-full border uppercase tracking-wider ${getStatusBadge(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                <div className="flex items-center space-x-4 text-xs text-slate-400">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Recent'}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{order.items?.length || 0} Line Item(s)</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end space-x-4">
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Order Total</span>
                  <span className="text-lg font-black text-white">${Number(order.total_amount || 0).toFixed(2)}</span>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
