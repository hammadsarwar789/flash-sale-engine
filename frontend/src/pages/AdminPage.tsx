import React, { useState, useEffect } from 'react';
import { adminApi, SystemStats, OutboxEventItem, TaskLogItem } from '../api/admin';
import { productsApi } from '../api/products';
import { Product, Category, Order, User, ProductVariant } from '../types/api';
import {
  ShieldAlert,
  Package,
  Users,
  Tag,
  Plus,
  RefreshCw,
  Truck,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  Trash2,
  Edit3,
  Flame,
  Search,
  FileText,
  DollarSign,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'coupons' | 'categories' | 'users'>('overview');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [outboxEvents, setOutboxEvents] = useState<OutboxEventItem[]>([]);
  const [taskLogs, setTaskLogs] = useState<TaskLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Product Form state
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodPrice, setProdPrice] = useState<number>(29.99);
  const [prodStock, setProdStock] = useState<number>(100);
  const [prodDesc, setProdDesc] = useState('');
  const [prodImg, setProdImg] = useState('');
  const [prodCatId, setProdCatId] = useState('');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Variant Modal / Inline state
  const [variantProdId, setVariantProdId] = useState<string | null>(null);
  const [varName, setVarName] = useState('');
  const [varSku, setVarSku] = useState('');
  const [varPrice, setVarPrice] = useState<number>(19.99);
  const [varSize, setVarSize] = useState('');
  const [varColor, setVarColor] = useState('');
  const [varStock, setVarStock] = useState<number>(50);

  // Coupon Generator state
  const [couponCode, setCouponCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [minOrderAmt, setMinOrderAmt] = useState<number>(0);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);

  // Category Form state
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // Order Fulfillment update state
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('');
  const [newOrderStatus, setNewOrderStatus] = useState<string>('SHIPPED');
  const [trackingNumber, setTrackingNumber] = useState<string>('');

  const loadAdminData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [statsData, prodsData, catsData, ordersData, usersData, outboxData, logsData] = await Promise.all([
        adminApi.getStats().catch(() => null),
        productsApi.getProducts({ per_page: 100 }).catch(() => []),
        productsApi.getCategories().catch(() => []),
        adminApi.getAdminOrders(orderStatusFilter || undefined).catch(() => []),
        adminApi.listUsers().catch(() => []),
        adminApi.getOutboxEvents().catch(() => []),
        adminApi.listTaskLogs().catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      setProducts(prodsData);
      setCategories(catsData);
      setOrders(ordersData);
      setUsersList(usersData);
      setOutboxEvents(outboxData);
      setTaskLogs(logsData);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load admin data. Verify admin role privileges.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [orderStatusFilter]);

  // Create Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingProduct(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await adminApi.createProduct({
        name: prodName,
        sku: prodSku.toUpperCase(),
        price: prodPrice,
        total_stock: prodStock,
        description: prodDesc,
        images: prodImg ? [prodImg] : [],
        category_id: prodCatId || undefined,
      });
      setSuccessMsg(`Product '${prodName}' created successfully!`);
      setProdName('');
      setProdSku('');
      setProdDesc('');
      setProdImg('');
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create product.');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`Deactivate product '${productName}'?`)) return;
    try {
      await adminApi.deleteProduct(productId);
      setSuccessMsg(`Product '${productName}' deactivated.`);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete product.');
    }
  };

  // Sync Redis Stock
  const handleSyncStock = async (productId: string) => {
    try {
      const res = await adminApi.syncProductStock(productId);
      setSuccessMsg(`Stock reconciled in Redis: ${res.message}`);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Stock sync failed.');
    }
  };

  // Create Variant
  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantProdId) return;
    try {
      await adminApi.createVariant(variantProdId, {
        name: varName,
        sku: varSku.toUpperCase(),
        price: varPrice,
        size: varSize || undefined,
        color: varColor || undefined,
        total_stock: varStock,
        available_stock: varStock,
      });
      setSuccessMsg(`Variant '${varName}' added!`);
      setVariantProdId(null);
      setVarName('');
      setVarSku('');
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create variant.');
    }
  };

  // Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingCat(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await adminApi.createCategory({ name: catName, description: catDesc });
      setSuccessMsg(`Category '${catName}' created.`);
      setCatName('');
      setCatDesc('');
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create category.');
    } finally {
      setIsCreatingCat(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (catId: string, name: string) => {
    if (!window.confirm(`Delete category '${name}'?`)) return;
    try {
      await adminApi.deleteCategory(catId);
      setSuccessMsg(`Category '${name}' deleted.`);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete category.');
    }
  };

  // Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingCoupon(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await adminApi.createCoupon({
        code: couponCode.toUpperCase(),
        discount_type: discountType,
        discount_value: discountValue,
        min_order_amount: minOrderAmt,
      });
      setSuccessMsg(`Promo Code '${couponCode.toUpperCase()}' activated!`);
      setCouponCode('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create coupon.');
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  // Update Order Status / Trigger Refund
  const handleUpdateOrderStatus = async (orderId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await adminApi.updateOrder(orderId, {
        status: newOrderStatus,
        tracking_number: trackingNumber || undefined,
      });
      if (newOrderStatus === 'REFUNDED' && res.refund) {
        setSuccessMsg(`Order #${orderId} refunded on Stripe! Refund ID: ${res.refund.refund_id}`);
      } else {
        setSuccessMsg(`Order #${orderId} status updated to '${newOrderStatus}'!`);
      }
      setUpdatingOrderId(null);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update order status.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-8 rounded-3xl glass-panel border border-cyan-500/30 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            <span>Admin Control Center</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">System & Operations Portal</h1>
          <p className="text-slate-300 text-sm">Product catalog CRUD, promo coupon creation, order status updates, and telemetry.</p>
        </div>

        <button
          onClick={loadAdminData}
          disabled={isLoading}
          className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh All</span>
        </button>
      </div>

      {/* Alert Banners */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-bold flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Telemetry Stat Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase">Products</span>
            <p className="text-2xl font-black text-white">{stats.total_products}</p>
          </div>
          <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase">Total Orders</span>
            <p className="text-2xl font-black text-cyan-400">{stats.total_orders}</p>
          </div>
          <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase">Paid Orders</span>
            <p className="text-2xl font-black text-emerald-400">{stats.paid_orders}</p>
          </div>
          <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase">Pending</span>
            <p className="text-2xl font-black text-amber-400">{stats.pending_orders}</p>
          </div>
          <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase">Users Directory</span>
            <p className="text-2xl font-black text-white">{stats.total_users}</p>
          </div>
          <div className="p-4 rounded-2xl glass-card border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400 font-bold uppercase">Outbox Queue</span>
            <p className="text-2xl font-black text-blue-400">{stats.outbox_published}</p>
          </div>
        </div>
      )}

      {/* Sub-Routes Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center space-x-2 ${
            activeTab === 'overview' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'bg-slate-900 text-slate-300 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Dashboard & Telemetry</span>
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center space-x-2 ${
            activeTab === 'products' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'bg-slate-900 text-slate-300 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Product Catalog CRUD</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center space-x-2 ${
            activeTab === 'orders' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'bg-slate-900 text-slate-300 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Fulfillment & Refunds</span>
        </button>
        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center space-x-2 ${
            activeTab === 'coupons' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'bg-slate-900 text-slate-300 hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Coupons Generator</span>
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center space-x-2 ${
            activeTab === 'categories' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'bg-slate-900 text-slate-300 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Categories</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center space-x-2 ${
            activeTab === 'users' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'bg-slate-900 text-slate-300 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Directory</span>
        </button>
      </div>

      {/* Tab: Products CRUD */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Create Product Form */}
          <form onSubmit={handleCreateProduct} className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
            <h3 className="font-extrabold text-base text-white border-b border-slate-800 pb-3 flex items-center space-x-2">
              <Plus className="w-5 h-5 text-cyan-400" />
              <span>Create Product</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Product Title</label>
              <input
                type="text"
                required
                placeholder="AirPods Max Wireless"
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">SKU</label>
                <input
                  type="text"
                  required
                  placeholder="AIR-MAX-01"
                  value={prodSku}
                  onChange={(e) => setProdSku(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={prodPrice}
                  onChange={(e) => setProdPrice(parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Stock</label>
                <input
                  type="number"
                  required
                  value={prodStock}
                  onChange={(e) => setProdStock(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Category</label>
                <select
                  value={prodCatId}
                  onChange={(e) => setProdCatId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Image URL</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={prodImg}
                onChange={(e) => setProdImg(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={isCreatingProduct}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {isCreatingProduct ? 'Creating...' : 'Create & Warmup Redis Stock'}
            </button>
          </form>

          {/* Product Listing & Actions Table */}
          <div className="lg:col-span-2 p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
            <h3 className="font-extrabold text-base text-white border-b border-slate-800 pb-3">
              Manage Active Products ({products.length})
            </h3>
            
            <div className="space-y-3">
              {products.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-cyan-400 font-bold text-xs">{p.sku}</span>
                      <h4 className="font-bold text-white text-sm">{p.name}</h4>
                    </div>
                    <p className="text-xs text-slate-400">Price: ${Number(p.price).toFixed(2)} | Stock: {p.available_stock ?? p.total_stock} units</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSyncStock(p.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700"
                      title="Sync Redis stock cache with DB"
                    >
                      Sync Redis
                    </button>
                    <button
                      onClick={() => setVariantProdId(variantProdId === p.id ? null : p.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/30"
                    >
                      + Variant
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id, p.name)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 border border-rose-500/20"
                      title="Deactivate product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Variant Creation Modal / Inline Section */}
      {variantProdId && (
        <form onSubmit={handleCreateVariant} className="p-6 rounded-3xl glass-card border border-cyan-500/40 space-y-4 animate-fadeIn">
          <h3 className="font-bold text-base text-white">Add Variant for Product ID #{variantProdId}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input
              type="text"
              required
              placeholder="Variant Name (e.g. Red / Large)"
              value={varName}
              onChange={(e) => setVarName(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              required
              placeholder="Variant SKU"
              value={varSku}
              onChange={(e) => setVarSku(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white"
            />
            <input
              type="number"
              step="0.01"
              required
              placeholder="Price"
              value={varPrice}
              onChange={(e) => setVarPrice(parseFloat(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
            <input
              type="number"
              required
              placeholder="Stock"
              value={varStock}
              onChange={(e) => setVarStock(parseInt(e.target.value, 10))}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={() => setVariantProdId(null)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300">Cancel</button>
            <button type="submit" className="px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs">Save Variant</button>
          </div>
        </form>
      )}

      {/* Tab: Orders & Refund Trigger */}
      {activeTab === 'orders' && (
        <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-white">Order Fulfillment & Refund Triggers</h3>
            
            {/* Status Filter */}
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-1.5"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono">
                  <th className="pb-3">Order ID</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Total</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-900/50">
                    <td className="py-3.5 font-mono font-bold text-white">#{o.id.substring(0, 12)}...</td>
                    <td className="py-3.5 text-slate-300">{o.guest_email || o.user_id || 'Customer'}</td>
                    <td className="py-3.5">
                      <span className="bg-slate-800 border border-slate-700 text-cyan-400 px-2.5 py-1 rounded-full font-bold">
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3.5 font-extrabold text-white">${Number(o.total_amount || 0).toFixed(2)}</td>
                    <td className="py-3.5">
                      {updatingOrderId === o.id ? (
                        <div className="flex items-center space-x-2">
                          <select
                            value={newOrderStatus}
                            onChange={(e) => setNewOrderStatus(e.target.value)}
                            className="bg-slate-900 border border-slate-800 text-xs text-white rounded-lg p-1"
                          >
                            <option value="SHIPPED">SHIPPED</option>
                            <option value="DELIVERED">DELIVERED</option>
                            <option value="REFUNDED">REFUNDED (Triggers Stripe Refund)</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Tracking #"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            className="bg-slate-900 border border-slate-800 text-xs text-white rounded-lg p-1 w-24"
                          />
                          <button
                            onClick={() => handleUpdateOrderStatus(o.id)}
                            className="bg-emerald-500 text-slate-950 font-bold px-2 py-1 rounded-lg"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setUpdatingOrderId(o.id);
                            setNewOrderStatus(o.status || 'SHIPPED');
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold px-3 py-1.5 rounded-lg border border-slate-700"
                        >
                          Update / Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Promo Coupons */}
      {activeTab === 'coupons' && (
        <div className="max-w-xl mx-auto p-8 rounded-3xl glass-card border border-slate-800 space-y-6">
          <div className="space-y-1">
            <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
              <Tag className="w-5 h-5 text-cyan-400" />
              <span>Promo Code Generator</span>
            </h3>
            <p className="text-slate-400 text-xs">Create new promotional discount codes for flash-sale events.</p>
          </div>

          <form onSubmit={handleCreateCoupon} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Coupon Code</label>
              <input
                type="text"
                required
                placeholder="SUMMER25"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm uppercase font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Dollar ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Value</label>
                <input
                  type="number"
                  required
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Minimum Order Amount ($)</label>
              <input
                type="number"
                value={minOrderAmt}
                onChange={(e) => setMinOrderAmt(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              type="submit"
              disabled={isCreatingCoupon}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {isCreatingCoupon ? 'Activating Code...' : 'Activate Promo Code'}
            </button>
          </form>
        </div>
      )}

      {/* Tab: Categories */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={handleCreateCategory} className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
            <h3 className="font-extrabold text-base text-white border-b border-slate-800 pb-3 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>Create Category</span>
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Name</label>
              <input
                type="text"
                required
                placeholder="Electronics"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Description</label>
              <textarea
                rows={3}
                placeholder="Smartphones, laptops..."
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              disabled={isCreatingCat}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {isCreatingCat ? 'Creating...' : 'Create Category'}
            </button>
          </form>

          <div className="lg:col-span-2 p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
            <h3 className="font-extrabold text-base text-white border-b border-slate-800 pb-3">Categories ({categories.length})</h3>
            <div className="space-y-2">
              {categories.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-sm text-white">{c.name}</h4>
                    <p className="text-xs text-slate-400">/{c.slug}</p>
                  </div>
                  <button onClick={() => handleDeleteCategory(c.id, c.name)} className="text-rose-400 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Users Directory */}
      {activeTab === 'users' && (
        <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
          <h3 className="font-extrabold text-base text-white border-b border-slate-800 pb-3 flex items-center space-x-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span>Read-Only User Directory ({usersList.length})</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono">
                  <th className="pb-3">User ID</th>
                  <th className="pb-3">Full Name</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Email Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/50">
                    <td className="py-3 font-mono text-slate-400">#{u.id.substring(0, 10)}...</td>
                    <td className="py-3 font-semibold text-white">{u.full_name || 'N/A'}</td>
                    <td className="py-3 text-cyan-400">{u.email}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        u.role === 'admin' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {u.role || 'user'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        u.is_email_verified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {u.is_email_verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Overview Telemetry */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Outbox Events Stream */}
          <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
            <h3 className="font-extrabold text-base text-white border-b border-slate-800 pb-3 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span>Outbox Event Stream</span>
            </h3>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {outboxEvents.map((ev) => (
                <div key={ev.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono text-cyan-400 font-bold">{ev.event_type}</span>
                    <p className="text-slate-400">{ev.aggregate_type} #{ev.aggregate_id}</p>
                  </div>
                  <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full font-bold text-[10px]">
                    {ev.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Celery Task Logs */}
          <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
            <h3 className="font-extrabold text-base text-white border-b border-slate-800 pb-3 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              <span>Celery Task Logs</span>
            </h3>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {taskLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono text-white font-bold">{log.task_name}</span>
                    <p className="text-slate-400">{log.created_at ? new Date(log.created_at).toLocaleTimeString() : 'Log'}</p>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold text-[10px]">
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
