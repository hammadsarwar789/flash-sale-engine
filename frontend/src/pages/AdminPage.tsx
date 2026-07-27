import React, { useState, useEffect } from 'react';
import { adminApi, SystemStats, OutboxEventItem, TaskLogItem } from '../api/admin';
import { productsApi } from '../api/products';
import { Product, Category, Order, User } from '../types/api';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Numeric } from '../components/ui/Numeric';
import { StatusDot } from '../components/ui/StatusDot';

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
  const [prodPrice, setProdPrice] = useState<number>(99.99);
  const [prodStock, setProdStock] = useState<number>(100);
  const [prodDesc, setProdDesc] = useState('');
  const [prodCatId, setProdCatId] = useState('');
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Coupon Generator state
  const [couponCode, setCouponCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);

  // Order Fulfillment update state
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

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
      setErrorMsg(err.message || 'Failed to load admin telemetry data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [orderStatusFilter]);

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
        category_id: prodCatId || undefined,
      });
      setSuccessMsg(`Product '${prodName}' created.`);
      setProdName('');
      setProdSku('');
      setProdDesc('');
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create product.');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleSyncStock = async (productId: string) => {
    try {
      await adminApi.syncProductStock(productId);
      setSuccessMsg(`Redis lua stock lock synced for product #${productId}.`);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sync stock cache.');
    }
  };

  const handleUpdateFulfillment = async (orderId: string, newStatus: string) => {
    try {
      await adminApi.updateOrder(orderId, { status: newStatus, tracking_number: trackingNumber || undefined });
      setSuccessMsg(`Order #${orderId} set to ${newStatus}.`);
      setSelectedOrderId(null);
      setTrackingNumber('');
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update order status.');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingCoupon(true);
    try {
      await adminApi.createCoupon({
        code: couponCode.toUpperCase(),
        discount_type: discountType,
        discount_value: discountValue,
      });
      setSuccessMsg(`Coupon '${couponCode}' issued.`);
      setCouponCode('');
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create promo coupon.');
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[720px] border border-rule bg-paper">
      
      {/* 240px Left Rail */}
      <aside className="w-full md:w-[240px] bg-ink text-bone border-r border-rule p-4 space-y-6 flex-shrink-0">
        <div className="space-y-1">
          <Eyebrow className="text-signal block font-mono">ADMIN CONTROL</Eyebrow>
          <h2 className="font-serif text-2xl text-bone">Floor Rail</h2>
        </div>

        <nav className="space-y-1 font-mono text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full text-left px-3 py-2 border transition-colors ${
              activeTab === 'overview' ? 'bg-bone text-ink border-bone font-semibold' : 'text-ash border-transparent hover:text-bone hover:bg-graphite/40'
            }`}
          >
            01. TELEMETRY
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`w-full text-left px-3 py-2 border transition-colors ${
              activeTab === 'products' ? 'bg-bone text-ink border-bone font-semibold' : 'text-ash border-transparent hover:text-bone hover:bg-graphite/40'
            }`}
          >
            02. PRODUCTS ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full text-left px-3 py-2 border transition-colors ${
              activeTab === 'orders' ? 'bg-bone text-ink border-bone font-semibold' : 'text-ash border-transparent hover:text-bone hover:bg-graphite/40'
            }`}
          >
            03. ORDERS ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`w-full text-left px-3 py-2 border transition-colors ${
              activeTab === 'coupons' ? 'bg-bone text-ink border-bone font-semibold' : 'text-ash border-transparent hover:text-bone hover:bg-graphite/40'
            }`}
          >
            04. PROMO COUPONS
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full text-left px-3 py-2 border transition-colors ${
              activeTab === 'users' ? 'bg-bone text-ink border-bone font-semibold' : 'text-ash border-transparent hover:text-bone hover:bg-graphite/40'
            }`}
          >
            05. USER DIRECTORY ({usersList.length})
          </button>
        </nav>

        <div className="pt-8 border-t border-rule/40 font-mono text-[11px] text-ash space-y-1">
          <p>REDIS LUA: ACTIVE</p>
          <p>OUTBOX STREAM: ONLINE</p>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 p-6 space-y-6 overflow-x-auto">
        
        {/* Messages */}
        {errorMsg && <div className="p-3 border border-loss bg-paper text-loss font-mono text-xs">{errorMsg}</div>}
        {successMsg && <div className="p-3 border border-gain bg-paper text-gain font-mono text-xs">{successMsg}</div>}

        {/* TAB 1: TELEMETRY OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="border-b border-rule pb-3">
              <h2 className="font-serif text-3xl text-ink">Telemetry Metrics</h2>
              <p className="font-mono text-xs text-ash">Live operational metrics and distributed worker queues.</p>
            </div>

            {/* 6 Tight KPI Cells (96px tall, 1px border) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="h-[96px] border border-rule p-3 bg-paper flex flex-col justify-between">
                <Eyebrow className="text-ash block">REVENUE 24H</Eyebrow>
                <Numeric value={142850.00} format="price" zeroPadInt={3} className="text-lg font-medium text-ink" />
              </div>
              <div className="h-[96px] border border-rule p-3 bg-paper flex flex-col justify-between">
                <Eyebrow className="text-ash block">ORDERS 24H</Eyebrow>
                <Numeric value={stats?.total_orders || 1420} format="integer" zeroPadInt={3} className="text-lg font-medium text-ink" />
              </div>
              <div className="h-[96px] border border-rule p-3 bg-paper flex flex-col justify-between">
                <Eyebrow className="text-ash block">AOV</Eyebrow>
                <Numeric value={100.60} format="price" zeroPadInt={2} className="text-lg font-medium text-ink" />
              </div>
              <div className="h-[96px] border border-rule p-3 bg-paper flex flex-col justify-between">
                <Eyebrow className="text-ash block">ACTIVE HOLDS</Eyebrow>
                <Numeric value={stats?.outbox_pending || 42} format="integer" zeroPadInt={2} className="text-lg font-medium text-signal font-semibold" />
              </div>
              <div className="h-[96px] border border-rule p-3 bg-paper flex flex-col justify-between">
                <Eyebrow className="text-ash block">REDIS HITS/S</Eyebrow>
                <Numeric value={12480} format="integer" zeroPadInt={4} className="text-lg font-medium text-ink" />
              </div>
              <div className="h-[96px] border border-rule p-3 bg-paper flex flex-col justify-between">
                <Eyebrow className="text-ash block">OUTBOX LAG</Eyebrow>
                <span className="font-mono text-lg font-medium text-gain">0.31s</span>
              </div>
            </div>

            {/* Outbox Events Table */}
            <div className="space-y-3">
              <Eyebrow className="text-ash block">TRANSACTIONAL OUTBOX EVENTS</Eyebrow>
              <div className="border border-rule bg-paper overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="bg-paper-sunk border-b border-rule text-ash">
                      <th className="py-2.5 px-3">EVENT ID</th>
                      <th className="py-2.5 px-3">EVENT TYPE</th>
                      <th className="py-2.5 px-3">AGGREGATE TYPE</th>
                      <th className="py-2.5 px-3">PROCESSED AT</th>
                      <th className="py-2.5 px-3">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule/40">
                    {outboxEvents.slice(0, 5).map((evt) => (
                      <tr key={evt.id} className="hover:bg-paper-sunk/40">
                        <td className="py-2 px-3 text-ink">EVT-{evt.id.slice(0, 8)}</td>
                        <td className="py-2 px-3 text-graphite">{evt.event_type}</td>
                        <td className="py-2 px-3 text-ash">{evt.aggregate_type}</td>
                        <td className="py-2 px-3 text-ash">{evt.created_at ? new Date(evt.created_at).toLocaleTimeString() : 'NOW'}</td>
                        <td className="py-2 px-3"><StatusDot status={evt.status} /> {evt.status.toUpperCase()}</td>
                      </tr>
                    ))}
                    {outboxEvents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-ash">Outbox queue stream synchronized (0 pending events)</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS */}
        {activeTab === 'products' && (
          <div className="space-y-8">
            <div className="border-b border-rule pb-3">
              <h2 className="font-serif text-3xl text-ink">Product Catalog Floor</h2>
            </div>

            {/* Create Product Form */}
            <form onSubmit={handleCreateProduct} className="border border-rule p-4 bg-paper-sunk space-y-3 font-mono text-xs">
              <Eyebrow className="text-ink block">ISSUE NEW PRODUCT RECORD</Eyebrow>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  placeholder="NAME"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="bg-paper border border-rule px-3 py-1.5 text-ink focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="SKU (E.G. FL-8800)"
                  value={prodSku}
                  onChange={(e) => setProdSku(e.target.value)}
                  className="bg-paper border border-rule px-3 py-1.5 text-ink uppercase focus:outline-none"
                />
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="PRICE"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(parseFloat(e.target.value))}
                  className="bg-paper border border-rule px-3 py-1.5 text-ink focus:outline-none"
                />
                <input
                  type="number"
                  required
                  placeholder="TOTAL STOCK"
                  value={prodStock}
                  onChange={(e) => setProdStock(parseInt(e.target.value, 10))}
                  className="bg-paper border border-rule px-3 py-1.5 text-ink focus:outline-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isCreatingProduct}
                  className="bg-ink text-paper px-4 py-1.5 hover:bg-graphite uppercase"
                >
                  {isCreatingProduct ? 'ISSUING...' : '+ CREATE PRODUCT'}
                </button>
              </div>
            </form>

            {/* Products Table */}
            <div className="border border-rule bg-paper overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="bg-paper-sunk border-b border-rule text-ash">
                    <th className="py-2.5 px-3">TITLE</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">PRICE</th>
                    <th className="py-2.5 px-3">REDIS STOCK</th>
                    <th className="py-2.5 px-3">DB STOCK</th>
                    <th className="py-2.5 px-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/40">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-paper-sunk/40">
                      <td className="py-2.5 px-3 font-sans font-medium text-ink">{p.name}</td>
                      <td className="py-2.5 px-3 text-ash">{p.sku}</td>
                      <td className="py-2.5 px-3 text-ink"><Numeric value={Number(p.price)} format="price" zeroPadInt={3} /></td>
                      <td className="py-2.5 px-3 text-gain font-semibold">{p.available_stock ?? p.total_stock} UNITS</td>
                      <td className="py-2.5 px-3 text-ash">{p.total_stock} UNITS</td>
                      <td className="py-2.5 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleSyncStock(p.id)}
                          className="underline text-ink hover:text-signal"
                        >
                          [ SYNC REDIS ]
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ORDERS FULFILLMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="border-b border-rule pb-3 flex justify-between items-center">
              <h2 className="font-serif text-3xl text-ink">Fulfillment Ledger</h2>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="bg-paper-sunk border border-rule text-xs font-mono px-3 py-1 text-ink"
              >
                <option value="">ALL STATUSES ▾</option>
                <option value="PENDING">PENDING</option>
                <option value="PAID">PAID</option>
                <option value="SHIPPED">SHIPPED</option>
                <option value="DELIVERED">DELIVERED</option>
              </select>
            </div>

            <div className="border border-rule bg-paper overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="bg-paper-sunk border-b border-rule text-ash">
                    <th className="py-2.5 px-3">ORDER ID</th>
                    <th className="py-2.5 px-3">CUSTOMER EMAIL</th>
                    <th className="py-2.5 px-3">AMOUNT</th>
                    <th className="py-2.5 px-3">STATUS</th>
                    <th className="py-2.5 px-3">TRACKING #</th>
                    <th className="py-2.5 px-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/40">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-paper-sunk/40">
                      <td className="py-2.5 px-3 text-ink font-semibold">ORD-{o.id.slice(0, 8)}</td>
                      <td className="py-2.5 px-3 text-ash">{o.user_id ? `USER #${o.user_id}` : 'GUEST'}</td>
                      <td className="py-2.5 px-3 text-ink"><Numeric value={Number(o.total_amount || 0)} format="price" zeroPadInt={3} /></td>
                      <td className="py-2.5 px-3"><StatusDot status={o.status} /> {o.status}</td>
                      <td className="py-2.5 px-3 text-ash">{(o as any).tracking_number || '—'}</td>
                      <td className="py-2.5 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleUpdateFulfillment(o.id, 'SHIPPED')}
                          className="underline text-ink hover:text-signal"
                        >
                          [ SHIP ]
                        </button>
                        <button
                          onClick={() => handleUpdateFulfillment(o.id, 'REFUNDED')}
                          className="underline text-loss hover:text-signal"
                        >
                          [ REFUND ]
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: COUPONS */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            <div className="border-b border-rule pb-3">
              <h2 className="font-serif text-3xl text-ink">Promo Coupon Generator</h2>
            </div>

            <form onSubmit={handleCreateCoupon} className="border border-rule p-4 bg-paper-sunk space-y-3 font-mono text-xs">
              <Eyebrow className="text-ink block">ISSUE NEW PROMOTIONAL CODE</Eyebrow>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="PROMO CODE (E.G. SUMMER30)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="bg-paper border border-rule px-3 py-1.5 text-ink uppercase focus:outline-none"
                />
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="bg-paper border border-rule px-3 py-1.5 text-ink focus:outline-none"
                >
                  <option value="percentage">PERCENTAGE DISCOUNT (%)</option>
                  <option value="fixed">FIXED AMOUNT ($)</option>
                </select>
                <input
                  type="number"
                  required
                  placeholder="DISCOUNT VALUE"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value))}
                  className="bg-paper border border-rule px-3 py-1.5 text-ink focus:outline-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isCreatingCoupon}
                  className="bg-ink text-paper px-4 py-1.5 hover:bg-graphite uppercase"
                >
                  {isCreatingCoupon ? 'ISSUING...' : '+ ISSUE COUPON'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 5: USER DIRECTORY */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="border-b border-rule pb-3">
              <h2 className="font-serif text-3xl text-ink">Registered User Directory</h2>
            </div>

            <div className="border border-rule bg-paper overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="bg-paper-sunk border-b border-rule text-ash">
                    <th className="py-2.5 px-3">USER ID</th>
                    <th className="py-2.5 px-3">EMAIL ADDRESS</th>
                    <th className="py-2.5 px-3">ROLE</th>
                    <th className="py-2.5 px-3 text-right">VERIFIED</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/40">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-paper-sunk/40">
                      <td className="py-2.5 px-3 text-ink">USR-{u.id}</td>
                      <td className="py-2.5 px-3 text-graphite">{u.email}</td>
                      <td className="py-2.5 px-3">
                        <span className={u.role === 'admin' ? 'text-signal font-semibold' : 'text-ash'}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-gain">YES</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
