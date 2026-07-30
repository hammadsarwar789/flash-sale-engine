import React, { useState, useEffect } from 'react';
import { adminApi, SystemStats, OutboxEventItem, TaskLogItem } from '../api/admin';
import { productsApi } from '../api/products';
import { useNavigate } from 'react-router-dom';
import { Product, Category, Order, User, Coupon } from '../types/api';
import { useAuth } from '../context/AuthContext';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Numeric } from '../components/ui/Numeric';
import { StatusDot } from '../components/ui/StatusDot';

export const AdminPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role;

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 p-8 border border-rule bg-paper space-y-4 font-mono text-xs text-center">
        <Eyebrow className="text-signal block font-mono">AUTHENTICATION REQUIRED</Eyebrow>
        <h2 className="font-serif text-3xl text-ink">Admin Control Floor</h2>
        <p className="text-ash">You are currently unauthenticated. Please log in with Super Admin credentials to access operational telemetry and approval pipelines.</p>
        <div className="p-3 bg-paper-sunk border border-rule font-semibold text-ink inline-block text-left w-full space-y-1">
          <p><span className="text-ash">EMAIL:</span> admin@flashsale.com</p>
          <p><span className="text-ash">PASSWORD:</span> Password123</p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-ink text-bone py-3 font-semibold uppercase hover:bg-graphite transition-colors cursor-pointer"
        >
          GO TO LOGIN PAGE →
        </button>
      </div>
    );
  }

  const initialTab = role === 'stock_operator' ? 'outlets' : (role === 'manager' ? 'products' : 'overview');
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'coupons' | 'categories' | 'users' | 'approvals' | 'roles' | 'outlets'>(initialTab);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [outboxEvents, setOutboxEvents] = useState<OutboxEventItem[]>([]);
  const [taskLogs, setTaskLogs] = useState<TaskLogItem[]>([]);

  // Phase 6 Multi-Tenant & Approval states
  const [approvalsList, setApprovalsList] = useState<any[]>([]);
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [permissionsList, setPermissionsList] = useState<any[]>([]);
  const [outletInventories, setOutletInventories] = useState<any[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<string>('out_fsd_01');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Role creation state
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  // Transfer stock state
  const [transferSourceOutlet, setTransferSourceOutlet] = useState('out_fsd_01');
  const [transferTargetOutlet, setTransferTargetOutlet] = useState('out_lhr_01');
  const [transferSku, setTransferSku] = useState('SKU-1001');
  const [transferQty, setTransferQty] = useState<number>(5);

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
  const [prodVendorId, setProdVendorId] = useState('');
  const [prodDiscountPct, setProdDiscountPct] = useState<number>(0);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Coupon Generator state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [couponMinOrder, setCouponMinOrder] = useState<number>(0);
  const [couponValidDays, setCouponValidDays] = useState<number>(7);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);

  // Order Fulfillment update state & search/modals
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  
  // Ship Modal state
  const [shippingModalOrder, setShippingModalOrder] = useState<Order | null>(null);
  const [shipCarrier, setShipCarrier] = useState<string>('FEDEX EXPRESS');
  const [shipTrackingNum, setShipTrackingNum] = useState<string>('');

  // Refund Confirmation Modal state
  const [refundModalOrder, setRefundModalOrder] = useState<Order | null>(null);

  // Order Detail Drawer/Modal state
  const [detailModalOrder, setDetailModalOrder] = useState<Order | null>(null);

  // Edit Product / Stock Update Modal state
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdPrice, setEditProdPrice] = useState<number>(0);
  const [editProdStock, setEditProdStock] = useState<number>(0);
  const [editProdCatId, setEditProdCatId] = useState('');
  const [editProdVendorId, setEditProdVendorId] = useState('');
  const [editProdDiscountPct, setEditProdDiscountPct] = useState<number>(0);
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);

  // Variant editor state
  const [variantSku, setVariantSku] = useState('');
  const [variantName, setVariantName] = useState('');
  const [variantColor, setVariantColor] = useState('');
  const [variantSize, setVariantSize] = useState('');
  const [variantPrice, setVariantPrice] = useState<number>(0);
  const [variantStock, setVariantStock] = useState<number>(0);
  const [isCreatingVariant, setIsCreatingVariant] = useState(false);

  const loadAdminData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [statsData, prodsData, catsData, ordersData, usersData, outboxData, logsData, couponsData, approvalsData, auditLogsData, rolesData, permsData, outletInvData] = await Promise.all([
        role === 'admin' ? adminApi.getStats().catch(() => null) : Promise.resolve(null),
        productsApi.getProducts({ per_page: 100 }).catch(() => ({ items: [] as Product[] })),
        productsApi.getCategories().catch(() => []),
        (role === 'admin' || role === 'manager') ? adminApi.getAdminOrders(orderStatusFilter || undefined).catch(() => []) : Promise.resolve([]),
        (role === 'admin' || role === 'manager') ? adminApi.listUsers().catch(() => []) : Promise.resolve([]),
        role === 'admin' ? adminApi.getOutboxEvents().catch(() => []) : Promise.resolve([]),
        role === 'admin' ? adminApi.listTaskLogs().catch(() => []) : Promise.resolve([]),
        role === 'admin' ? adminApi.listCoupons().catch(() => []) : Promise.resolve([]),
        (role === 'admin' || role === 'manager') ? adminApi.getApprovals(approvalStatusFilter).catch(() => []) : Promise.resolve([]),
        (role === 'admin' || role === 'manager') ? adminApi.getApprovalAuditLogs().catch(() => []) : Promise.resolve([]),
        role === 'admin' ? adminApi.getRoles().catch(() => []) : Promise.resolve([]),
        role === 'admin' ? adminApi.getPermissions().catch(() => []) : Promise.resolve([]),
        adminApi.getOutletInventory(selectedOutletId).catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      setProducts(Array.isArray(prodsData) ? prodsData : (prodsData as any)?.items || []);
      setCategories(catsData);
      setOrders(ordersData);
      setUsersList(usersData);
      setOutboxEvents(outboxData);
      setTaskLogs(logsData);
      setCoupons(couponsData || []);
      setApprovalsList(approvalsData || []);
      setAuditLogsList(auditLogsData || []);
      setRolesList(rolesData || []);
      setPermissionsList(permsData || []);
      setOutletInventories(outletInvData || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load admin telemetry data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [orderStatusFilter, approvalStatusFilter]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingProduct(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const validPrice = Math.max(0.01, prodPrice || 0);
    const validStock = Math.max(0, prodStock || 0);
    const validDiscount = Math.min(100, Math.max(0, prodDiscountPct || 0));
    try {
      await adminApi.createProduct({
        name: prodName,
        sku: prodSku.toUpperCase(),
        price: validPrice,
        total_stock: validStock,
        description: prodDesc,
        category_id: prodCatId || undefined,
        vendor_id: prodVendorId || undefined,
        discount_percentage: validDiscount,
      } as any);
      setSuccessMsg(`Product '${prodName}' created with ${validDiscount}% discount.`);
      setProdName('');
      setProdSku('');
      setProdDesc('');
      setProdVendorId('');
      setProdDiscountPct(0);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create product.');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditProduct(p);
    setEditProdName(p.name);
    setEditProdPrice(Math.max(0.01, Number(p.price) || 0));
    setEditProdStock(Math.max(0, p.total_stock || p.available_stock || 0));
    setEditProdCatId(typeof p.category === 'object' ? (p.category as any)?.id || '' : p.category_id || '');
    setEditProdVendorId(p.vendor_id || '');
    setEditProdDiscountPct(Math.min(100, Math.max(0, Number((p as any).discount_percentage) || 0)));
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;
    setIsUpdatingProduct(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const validPrice = Math.max(0.01, editProdPrice || 0);
    const validStock = Math.max(0, editProdStock || 0);
    const validDiscount = Math.min(100, Math.max(0, editProdDiscountPct || 0));
    try {
      await adminApi.updateProduct(editProduct.id, {
        name: editProdName,
        price: validPrice,
        total_stock: validStock,
        available_stock: validStock,
        category_id: editProdCatId || undefined,
        vendor_id: editProdVendorId || undefined,
        discount_percentage: validDiscount,
      } as any);
      setSuccessMsg(`Product '${editProdName}' updated successfully (${validDiscount}% discount applied).`);
      setEditProduct(null);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update product stock.');
    } finally {
      setIsUpdatingProduct(false);
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

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;

    setIsCreatingVariant(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const validVariantPrice = Math.max(0.01, variantPrice || 0);
      const validVariantStock = Math.max(0, variantStock || 0);
      await adminApi.createVariant(editProduct.id, {
        sku: variantSku.toUpperCase(),
        name: variantName,
        color: variantColor || undefined,
        size: variantSize || undefined,
        price: validVariantPrice,
        total_stock: validVariantStock,
        available_stock: validVariantStock,
      });
      setSuccessMsg(`Variant '${variantSku}' added to '${editProduct.name}'.`);
      setVariantSku('');
      setVariantName('');
      setVariantColor('');
      setVariantSize('');
      setVariantPrice(0);
      setVariantStock(0);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create variant.');
    } finally {
      setIsCreatingVariant(false);
    }
  };

  const handleOpenShipModal = (order: Order) => {
    setShippingModalOrder(order);
    setShipCarrier((order as any).carrier || 'FEDEX EXPRESS');
    setShipTrackingNum((order as any).tracking_number || `TRK-${order.id.slice(0, 8).toUpperCase()}-GLOBAL`);
  };

  const handleConfirmShip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingModalOrder) return;
    try {
      await adminApi.updateOrder(shippingModalOrder.id, {
        status: 'SHIPPED',
        carrier: shipCarrier.trim() || 'FEDEX EXPRESS',
        tracking_number: shipTrackingNum.trim() || `TRK-${shippingModalOrder.id.slice(0, 8).toUpperCase()}-GLOBAL`,
      });
      setSuccessMsg(`Order ORD-${shippingModalOrder.id.slice(0, 8)} marked as SHIPPED with tracking ${shipTrackingNum}`);
      setShippingModalOrder(null);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update shipping status.');
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    try {
      await adminApi.updateOrder(orderId, { status: 'DELIVERED' });
      setSuccessMsg(`Order ORD-${orderId.slice(0, 8).toUpperCase()} marked as DELIVERED.`);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update delivery status.');
    }
  };

  const handleOpenRefundModal = (order: Order) => {
    setRefundModalOrder(order);
  };

  const handleConfirmRefund = async () => {
    if (!refundModalOrder) return;
    try {
      await adminApi.updateOrder(refundModalOrder.id, { status: 'REFUNDED' });
      setSuccessMsg(`Order ORD-${refundModalOrder.id.slice(0, 8)} successfully refunded.`);
      setRefundModalOrder(null);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to issue refund.');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingCoupon(true);
    const validVal = Math.max(0.01, discountValue || 0);
    const validMin = Math.max(0, couponMinOrder || 0);
    const validDays = Math.max(0, couponValidDays || 0);
    try {
      await adminApi.createCoupon({
        code: couponCode.toUpperCase(),
        discount_type: discountType,
        discount_value: validVal,
        min_order_amount: validMin,
        valid_days: validDays > 0 ? validDays : undefined,
      });
      setSuccessMsg(`Promo code '${couponCode}' issued (Min order: $${validMin.toFixed(2)}).`);
      setCouponCode('');
      setCouponMinOrder(0);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create promo coupon.');
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  const handleToggleCoupon = async (couponId: string, code: string, currentStatus: boolean) => {
    try {
      const res = await adminApi.toggleCoupon(couponId);
      setSuccessMsg(res.message || `Coupon '${code}' ${currentStatus ? 'paused' : 'resumed'}.`);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to update status for coupon '${code}'.`);
    }
  };

  const handleDeleteCoupon = async (couponId: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete promo coupon code '${code}'? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await adminApi.deleteCoupon(couponId);
      setSuccessMsg(res.message || `Coupon '${code}' deleted successfully.`);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to delete coupon '${code}'.`);
    }
  };

  const handleApprovalAction = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await adminApi.processApprovalAction(requestId, { action, comments: `Processed via Admin Control Rail` });
      setSuccessMsg(`Registration Request '${requestId}' set to ${action}.`);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to process approval action.`);
    }
  };

  const handleDeleteUser = async (targetUserId: string, targetEmail: string, targetRole: string) => {
    if (!window.confirm(`Are you sure you want to delete account '${targetEmail}' (${targetRole.toUpperCase()})? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await adminApi.deleteUser(targetUserId);
      setSuccessMsg(res.message || `Account '${targetEmail}' deleted successfully.`);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to delete account '${targetEmail}'.`);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName) return;
    try {
      await adminApi.createRole({
        name: newRoleName.trim(),
        description: newRoleDesc.trim(),
        permissions: selectedPerms,
      });
      setSuccessMsg(`Dynamic Role '${newRoleName}' created successfully.`);
      setNewRoleName('');
      setNewRoleDesc('');
      setSelectedPerms([]);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to create role.`);
    }
  };

  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminApi.transferStock({
        source_outlet_id: transferSourceOutlet,
        target_outlet_id: transferTargetOutlet,
        product_sku: transferSku,
        quantity: Number(transferQty),
      });
      setSuccessMsg(res.message || `Transferred ${transferQty} units of ${transferSku}`);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to transfer stock.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Session Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-rule bg-paper font-mono text-xs">
        <div>
          <span className="text-ash uppercase">ACTIVE OPERATOR SESSION: </span>
          <span className="text-ink font-semibold">{user?.email || 'GUEST'}</span>
          <span className="ml-2 px-2 py-0.5 border border-rule bg-paper-sunk text-signal font-bold uppercase">
            ROLE: {role}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => loadAdminData()}
            disabled={isLoading}
            className="px-4 py-1.5 bg-ink text-bone hover:bg-graphite transition-colors uppercase font-mono text-xs"
          >
            {isLoading ? 'SYNCING DATA...' : '↻ SYNC TELEMETRY'}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row min-h-[720px] border border-rule bg-paper">
      
      {/* 240px Left Rail */}
      <aside className="w-full md:w-[240px] bg-ink text-bone border-r border-rule p-4 space-y-6 flex-shrink-0">
        <div className="space-y-1">
          <Eyebrow className="text-signal block font-mono">ADMIN CONTROL</Eyebrow>
          <h2 className="font-serif text-2xl text-bone">Floor Rail</h2>
        </div>

        <nav className="space-y-1 font-mono text-xs">
          {role === 'admin' && (
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-3 py-2 border transition-colors ${
                activeTab === 'overview' ? 'bg-bone text-ink border-bone font-semibold' : 'text-ash border-transparent hover:text-bone hover:bg-graphite/40'
              }`}
            >
              01. TELEMETRY
            </button>
          )}

          {(role === 'admin' || role === 'manager') && (
            <button
              onClick={() => setActiveTab('products')}
              className={`w-full text-left px-3 py-2 border transition-colors ${
                activeTab === 'products' ? 'bg-bone text-ink border-bone font-semibold' : 'text-ash border-transparent hover:text-bone hover:bg-graphite/40'
              }`}
            >
              02. PRODUCTS ({products.length})
            </button>
          )}

          {(role === 'admin' || role === 'manager') && (
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full text-left px-3 py-2 border transition-colors ${
                activeTab === 'orders' ? 'bg-bone text-ink border-bone font-semibold' : 'text-ash border-transparent hover:text-bone hover:bg-graphite/40'
              }`}
            >
              03. ORDERS ({orders.length})
            </button>
          )}

          {role === 'admin' && (
            <button
              onClick={() => setActiveTab('coupons')}
              className={`w-full text-left px-3 py-2 border transition-colors ${
                activeTab === 'coupons' ? 'bg-bone text-ink border-bone font-semibold' : 'text-ash border-transparent hover:text-bone hover:bg-graphite/40'
              }`}
            >
              04. PROMO COUPONS
            </button>
          )}

          {(role === 'admin' || role === 'manager') && (
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full text-left px-3 py-2 border transition-colors ${
                activeTab === 'users' ? 'bg-bone text-ink border-bone font-semibold' : 'text-ash border-transparent hover:text-bone hover:bg-graphite/40'
              }`}
            >
              05. USER DIRECTORY ({usersList.length})
            </button>
          )}

          {(role === 'admin' || role === 'manager') && (
            <button
              onClick={() => setActiveTab('approvals')}
              className={`w-full text-left px-3 py-2 border transition-colors ${
                activeTab === 'approvals' ? 'bg-bone text-ink border-bone font-semibold' : 'text-ash border-transparent hover:text-bone hover:bg-graphite/40'
              }`}
            >
              06. APPROVALS ({approvalsList.length})
            </button>
          )}

          {role === 'admin' && (
            <button
              onClick={() => setActiveTab('roles')}
              className={`w-full text-left px-3 py-2 border transition-colors ${
                activeTab === 'roles' ? 'bg-bone text-ink border-bone font-semibold' : 'text-ash border-transparent hover:text-bone hover:bg-graphite/40'
              }`}
            >
              07. ROLES & RBAC
            </button>
          )}

          {(role === 'admin' || role === 'manager' || role === 'stock_operator') && (
            <button
              onClick={() => setActiveTab('outlets')}
              className={`w-full text-left px-3 py-2 border transition-colors ${
                activeTab === 'outlets' ? 'bg-bone text-ink border-bone font-semibold' : 'text-ash border-transparent hover:text-bone hover:bg-graphite/40'
              }`}
            >
              08. OUTLET STOCKS
            </button>
          )}
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
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
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
                  min="0.01"
                  step="0.01"
                  placeholder="PRICE ($)"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(Math.max(0.01, parseFloat(e.target.value) || 0))}
                  className="bg-paper border border-rule px-3 py-1.5 text-ink focus:outline-none"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="DISCOUNT (% OFF)"
                  value={prodDiscountPct || ''}
                  onChange={(e) => setProdDiscountPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="bg-paper border border-rule px-3 py-1.5 text-ink focus:outline-none"
                />
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="TOTAL STOCK"
                  value={prodStock}
                  onChange={(e) => setProdStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="bg-paper border border-rule px-3 py-1.5 text-ink focus:outline-none"
                />
                <select
                  value={prodCatId}
                  onChange={(e) => setProdCatId(e.target.value)}
                  className="bg-paper border border-rule px-3 py-1.5 text-ink focus:outline-none"
                >
                  <option value="">SELECT CATEGORY (OPTIONAL)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                  ))}
                </select>
                <select
                  value={prodVendorId}
                  onChange={(e) => setProdVendorId(e.target.value)}
                  className="bg-paper border border-rule px-3 py-1.5 text-ink focus:outline-none"
                >
                  <option value="">ASSIGN VENDOR (OPTIONAL)</option>
                  {usersList.filter((u) => u.role === 'vendor').map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.full_name || vendor.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <input
                  type="text"
                  placeholder="OPTIONAL DESCRIPTION / PRODUCT DETAILS"
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  className="w-full sm:flex-1 bg-paper border border-rule px-3 py-1.5 text-ink focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isCreatingProduct}
                  className="w-full sm:w-auto bg-ink text-paper px-6 py-1.5 hover:bg-graphite uppercase whitespace-nowrap"
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
                    <th className="py-2.5 px-3">CATEGORY</th>
                    <th className="py-2.5 px-3">VENDOR</th>
                    <th className="py-2.5 px-3">VARIANTS</th>
                    <th className="py-2.5 px-3">PRICE</th>
                    <th className="py-2.5 px-3">DISCOUNT</th>
                    <th className="py-2.5 px-3">REDIS STOCK</th>
                    <th className="py-2.5 px-3">DB STOCK</th>
                    <th className="py-2.5 px-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/40">
                  {products.map((p) => (
                    <React.Fragment key={p.id}>
                    <tr className="hover:bg-paper-sunk/40">
                      <td className="py-2.5 px-3 font-sans font-medium text-ink">{p.name}</td>
                      <td className="py-2.5 px-3 text-ash">{p.sku}</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-paper-sunk px-2 py-0.5 border border-rule text-ink font-semibold">
                          {typeof p.category === 'object' ? p.category?.name?.toUpperCase() : (categories.find(c => c.id === (p.category_id || p.category))?.name?.toUpperCase() || 'GENERAL')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-ash">
                        <span className="bg-paper-sunk px-2 py-0.5 border border-rule text-ink font-semibold">
                          {p.vendor_name || 'Central Outlet'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-ash">
                        <button
                          type="button"
                          onClick={() => setExpandedProductId(expandedProductId === p.id ? null : p.id)}
                          className="underline text-signal hover:text-ink font-semibold"
                        >
                          {p.variants?.length || 0} VARIANTS {expandedProductId === p.id ? '▲' : '▼'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-ink"><Numeric value={Number(p.price)} format="price" zeroPadInt={3} /></td>
                      <td className="py-2.5 px-3 font-semibold">
                        {(p as any).discount_percentage > 0 ? (
                          <span className="bg-signal text-paper px-1.5 py-0.5 text-[10px]">SAVE {(p as any).discount_percentage}% OFF</span>
                        ) : (
                          <span className="text-ash">— NONE</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-gain font-semibold">{p.available_stock ?? p.total_stock} UNITS</td>
                      <td className="py-2.5 px-3 text-ash">{p.total_stock} UNITS</td>
                      <td className="py-2.5 px-3 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="underline text-signal hover:text-ink font-semibold"
                        >
                          [ EDIT STOCK ]
                        </button>
                        <button
                          onClick={() => handleSyncStock(p.id)}
                          className="underline text-ash hover:text-ink"
                        >
                          [ SYNC REDIS ]
                        </button>
                      </td>
                    </tr>
                    {expandedProductId === p.id && (
                      <tr className="bg-paper-sunk/30">
                        <td colSpan={10} className="py-3 px-3">
                          <div className="border border-rule bg-paper p-3 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-mono text-ash uppercase">
                              <span>Variant Details</span>
                              <span>{p.variants?.length || 0} records</span>
                            </div>
                            {p.variants && p.variants.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {p.variants.map((variant) => (
                                  <div key={variant.id} className="border border-rule px-3 py-2 bg-paper-sunk flex items-center justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-ink">{variant.name}</p>
                                      <p className="text-[11px] text-ash font-mono">SKU: {variant.sku}</p>
                                      <p className="text-[11px] text-ash font-mono">COLOR: {variant.color || 'N/A'} · SIZE: {variant.size || 'N/A'}</p>
                                    </div>
                                    <div className="text-right font-mono text-[11px]">
                                      <p className="text-ink font-semibold">{variant.available_stock} / {variant.total_stock} STOCK</p>
                                      <p className="text-gain">${Number(variant.price || 0).toFixed(2)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-ash font-mono text-xs">No variants seeded yet.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ORDERS FULFILLMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="border-b border-rule pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-serif text-3xl text-ink">Fulfillment Ledger</h2>
                <p className="font-mono text-xs text-ash mt-1">Real-time customer dispatch, carrier assignment, and refund management.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="SEARCH ORDER ID, EMAIL, TRACKING, OR CARRIER..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="bg-paper-sunk border border-rule text-xs font-mono px-3 py-1.5 text-ink placeholder-ash uppercase focus:outline-none focus:border-ink w-full sm:w-64"
                />
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="bg-paper-sunk border border-rule text-xs font-mono px-3 py-1.5 text-ink"
                >
                  <option value="">ALL STATUSES ▾</option>
                  <option value="PENDING">PENDING</option>
                  <option value="PAID">PAID</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="REFUNDED">REFUNDED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            <div className="border border-rule bg-paper overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="bg-paper-sunk border-b border-rule text-ash">
                    <th className="py-2.5 px-3">ORDER ID</th>
                    <th className="py-2.5 px-3">CUSTOMER EMAIL</th>
                    <th className="py-2.5 px-3">PRODUCT ITEMS</th>
                    <th className="py-2.5 px-3">AMOUNT</th>
                    <th className="py-2.5 px-3">STATUS</th>
                    <th className="py-2.5 px-3">CARRIER / TRACKING #</th>
                    <th className="py-2.5 px-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/40">
                  {orders
                    .filter((o) => {
                      if (!orderSearchQuery.trim()) return true;
                      const q = orderSearchQuery.toLowerCase();
                      const email = ((o as any).user_email || '').toLowerCase();
                      const name = ((o as any).user_full_name || '').toLowerCase();
                      const prodName = (o.product_name || '').toLowerCase();
                      const tracking = ((o as any).tracking_number || '').toLowerCase();
                      const carrier = ((o as any).carrier || '').toLowerCase();
                      const id = o.id.toLowerCase();
                      const status = o.status.toLowerCase();
                      return email.includes(q) || name.includes(q) || prodName.includes(q) || tracking.includes(q) || carrier.includes(q) || id.includes(q) || status.includes(q);
                    })
                    .map((o) => (
                      <tr key={o.id} className="hover:bg-paper-sunk/40">
                        <td className="py-2.5 px-3 font-semibold">
                          <button
                            onClick={() => setDetailModalOrder(o)}
                            className="text-ink hover:text-signal underline text-left"
                          >
                            ORD-{o.id.slice(0, 8).toUpperCase()}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-graphite">
                          <div className="font-semibold text-ink">{(o as any).user_email || 'guest@flashsale.com'}</div>
                          <div className="text-[11px] text-ash">{(o as any).user_full_name || 'Guest Customer'}</div>
                        </td>
                        <td className="py-2.5 px-3 text-ink">
                          {o.items && o.items.length > 0 ? (
                            <div className="space-y-0.5">
                              {o.items.map((item, i) => (
                                <div key={i} className="font-sans font-medium text-xs">
                                  {item.product_name || `Product #${item.product_id?.slice(0, 8)}`} {item.quantity > 1 ? `(x${item.quantity})` : ''}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="font-sans font-medium text-xs">{o.product_name || 'Flash Sale Order'}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-ink font-semibold">
                          <Numeric value={Number(o.total_amount || 0)} format="price" zeroPadInt={3} />
                        </td>
                        <td className="py-2.5 px-3">
                          <StatusDot status={o.status} /> {o.status}
                        </td>
                        <td className="py-2.5 px-3 text-ash">
                          {(o as any).tracking_number ? (
                            <div>
                              <span className="text-ink font-semibold">{(o as any).carrier || 'FEDEX EXPRESS'}</span>
                              <span className="block text-[11px] text-signal font-mono">{(o as any).tracking_number}</span>
                            </div>
                          ) : (
                            <span>— UNFULFILLED</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-2">
                          <button
                            onClick={() => setDetailModalOrder(o)}
                            className="underline text-ink hover:text-signal"
                          >
                            [ DETAILS ]
                          </button>
                          {o.status !== 'SHIPPED' && o.status !== 'DELIVERED' && o.status !== 'REFUNDED' && (
                            <button
                              onClick={() => handleOpenShipModal(o)}
                              className="underline text-ink hover:text-signal font-semibold"
                            >
                              [ SHIP ]
                            </button>
                          )}
                          {o.status === 'SHIPPED' && (
                            <button
                              onClick={() => handleMarkDelivered(o.id)}
                              className="underline text-gain hover:text-ink font-semibold"
                            >
                              [ MARK DELIVERED ]
                            </button>
                          )}
                          {o.status !== 'REFUNDED' && o.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleOpenRefundModal(o)}
                              className="underline text-loss hover:text-signal"
                            >
                              [ REFUND ]
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

        {/* TAB 4: COUPONS */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            <div className="border-b border-rule pb-3">
              <h2 className="font-serif text-3xl text-ink">Promo Coupon Generator</h2>
            </div>

            <form onSubmit={handleCreateCoupon} className="border border-rule p-4 bg-paper-sunk space-y-3 font-mono text-xs">
              <Eyebrow className="text-ink block">ISSUE NEW PROMOTIONAL CODE</Eyebrow>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
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
                  <option value="percentage">PERCENTAGE (%) DISCOUNT</option>
                  <option value="fixed">FIXED DOLLAR ($) DISCOUNT</option>
                </select>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="VALUE (E.G. 15 OR 30)"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Math.max(0.01, parseFloat(e.target.value) || 0))}
                  className="bg-paper border border-rule px-3 py-1.5 text-ink focus:outline-none"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="MIN ORDER ($)"
                  value={couponMinOrder || ''}
                  onChange={(e) => setCouponMinOrder(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="bg-paper border border-rule px-3 py-1.5 text-ink focus:outline-none"
                />
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="VALID DURATION (DAYS, E.G. 7)"
                  value={couponValidDays || ''}
                  onChange={(e) => setCouponValidDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="bg-paper border border-rule px-3 py-1.5 text-ink focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isCreatingCoupon}
                className="bg-ink text-paper font-sans text-xs uppercase px-6 py-2 hover:bg-graphite transition-colors disabled:opacity-50"
              >
                {isCreatingCoupon ? 'CREATING...' : 'ISSUE PROMO CODE →'}
              </button>
            </form>

            {/* Coupons List Table */}
            <div className="border border-rule bg-paper overflow-x-auto font-mono text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-paper-sunk border-b border-rule text-ash">
                    <th className="py-2.5 px-3">PROMO CODE</th>
                    <th className="py-2.5 px-3">DISCOUNT</th>
                    <th className="py-2.5 px-3">MIN ORDER</th>
                    <th className="py-2.5 px-3">TIMES USED</th>
                    <th className="py-2.5 px-3">EXPIRATION DATE / STATUS</th>
                    <th className="py-2.5 px-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/40">
                  {coupons.map((c) => {
                    const isExp = c.expires_at && new Date(c.expires_at).getTime() < Date.now();
                    const isPaused = c.is_active === false;
                    return (
                      <tr key={c.id} className="hover:bg-paper-sunk/40">
                        <td className="py-2.5 px-3 font-semibold text-ink flex items-center space-x-2">
                          <span>{c.code}</span>
                          {isPaused && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-loss/10 text-loss border border-loss/30 uppercase font-bold">
                              PAUSED
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-signal font-semibold">
                          {c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `$${c.discount_value} OFF`}
                        </td>
                        <td className="py-2.5 px-3 text-ash">${c.min_order_amount || '0.00'}</td>
                        <td className="py-2.5 px-3 text-ink">{c.times_used || 0} TIMES</td>
                        <td className="py-2.5 px-3">
                          {isPaused ? (
                            <span className="text-loss font-semibold">INACTIVE / PAUSED</span>
                          ) : c.expires_at ? (
                            <span className={isExp ? 'text-loss font-semibold' : 'text-gain font-semibold'}>
                              {isExp ? `EXPIRED (${new Date(c.expires_at).toLocaleDateString()})` : `VALID UNTIL ${new Date(c.expires_at).toLocaleDateString()}`}
                            </span>
                          ) : (
                            <span className="text-gain font-semibold">ACTIVE (PERPETUAL)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-2">
                          <button
                            onClick={() => handleToggleCoupon(c.id, c.code, c.is_active)}
                            className={`px-2.5 py-1 text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                              c.is_active
                                ? 'bg-paper-sunk border border-rule text-ash hover:text-ink'
                                : 'bg-gain text-paper hover:bg-gain/90'
                            }`}
                          >
                            {c.is_active ? 'PAUSE ⏸' : 'RESUME ▶'}
                          </button>
                          <button
                            onClick={() => handleDeleteCoupon(c.id, c.code)}
                            className="px-2.5 py-1 text-[11px] font-mono font-semibold bg-loss text-paper hover:bg-loss/90 transition-colors cursor-pointer"
                          >
                            DELETE ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {coupons.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-ash">No active promotional coupon codes issued yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="border-b border-rule pb-3">
              <h2 className="font-serif text-3xl text-ink">Product Categories</h2>
            </div>

            <div className="border border-rule bg-paper overflow-x-auto font-mono text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-paper-sunk border-b border-rule text-ash">
                    <th className="py-2.5 px-3">CATEGORY NAME</th>
                    <th className="py-2.5 px-3">SLUG</th>
                    <th className="py-2.5 px-3">DESCRIPTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/40">
                  {categories.map((c) => (
                    <tr key={c.id} className="hover:bg-paper-sunk/40">
                      <td className="py-2.5 px-3 text-ink font-semibold">{c.name}</td>
                      <td className="py-2.5 px-3 text-ash">{c.slug}</td>
                      <td className="py-2.5 px-3 text-graphite">{c.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: USERS DIRECTORY */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="border-b border-rule pb-3">
              <h2 className="font-serif text-3xl text-ink">User Directory</h2>
            </div>

            <div className="border border-rule bg-paper overflow-x-auto font-mono text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-paper-sunk border-b border-rule text-ash">
                    <th className="py-2.5 px-3">USER ID</th>
                    <th className="py-2.5 px-3">APPLICANT / EMAIL</th>
                    <th className="py-2.5 px-3">ROLE</th>
                    <th className="py-2.5 px-3">STATUS</th>
                    <th className="py-2.5 px-3 text-right">HIERARCHICAL ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/40">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-paper-sunk/40">
                      <td className="py-2.5 px-3 text-ink font-semibold">USR-{u.id.slice(0, 8)}</td>
                      <td className="py-2.5 px-3">
                        <p className="text-ink font-semibold">{u.full_name || u.email.split('@')[0]}</p>
                        <p className="text-ash text-[11px]">{u.email}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`font-semibold ${
                          u.role === 'admin' ? 'text-signal' : (u.role === 'manager' ? 'text-ink' : (u.role === 'vendor' ? 'text-ash' : 'text-ash/80'))
                        }`}>
                          {u.role ? u.role.toUpperCase() : 'USER'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold">
                        <span className={u.status === 'ACTIVE' || u.is_active ? 'text-gain' : 'text-loss'}>
                          {u.status || (u.is_active ? 'ACTIVE' : 'INACTIVE')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {u.id === user?.id ? (
                          <span className="text-ash text-[11px] font-mono font-semibold">SELF (YOU)</span>
                        ) : role === 'admin' ? (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email, u.role || 'user')}
                            className="px-2.5 py-1 bg-loss text-paper font-semibold hover:bg-loss/90 transition-colors text-[11px] cursor-pointer"
                          >
                            DELETE ✕
                          </button>
                        ) : (
                          <span className="text-ash text-[11px] font-mono font-semibold">VIEW ONLY</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: PENDING REGISTRATION APPROVALS */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            {role !== 'admin' && role !== 'manager' && (
              <div className="p-4 border border-loss bg-paper text-loss font-mono text-xs space-y-3">
                <div className="font-bold flex items-center justify-between">
                  <span>🔒 ADMIN OR MANAGER PRIVILEGES REQUIRED FOR APPROVAL CONTROL</span>
                  <button
                    onClick={async () => {
                      await logout();
                      navigate('/login');
                    }}
                    className="px-3 py-1 bg-loss text-paper uppercase font-semibold hover:bg-loss/90 transition-colors cursor-pointer"
                  >
                    LOG OUT & LOGIN AS ADMIN →
                  </button>
                </div>
                <p>You are currently logged in as <span className="underline font-semibold">{user?.email}</span> (Role: <span className="uppercase font-bold">{role}</span>).</p>
                <p>To view and approve pending registration requests, please log in with an authorized admin or manager account:</p>
                <div className="p-2.5 bg-paper-sunk border border-rule font-semibold text-ink inline-block">
                  Email: <span className="text-signal">admin@flashsale.com</span> · Password: <span className="text-signal">Password123</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center border-b border-rule pb-4">
              <div>
                <h2 className="font-serif text-3xl text-ink">Registration Approval Pipeline</h2>
                <p className="font-mono text-xs text-ash">Review and process hierarchical staff, manager, and vendor onboarding requests.</p>
              </div>
              <div className="flex items-center space-x-2 font-mono text-xs">
                {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setApprovalStatusFilter(filter)}
                    className={`px-3 py-1 border transition-colors ${
                      approvalStatusFilter === filter
                        ? 'bg-ink text-bone border-ink font-semibold'
                        : 'bg-paper text-ash border-rule hover:text-ink'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-rule bg-paper overflow-x-auto font-mono text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-paper-sunk border-b border-rule text-ash">
                    <th className="py-2.5 px-3">REQUEST ID</th>
                    <th className="py-2.5 px-3">APPLICANT</th>
                    <th className="py-2.5 px-3">TYPE</th>
                    <th className="py-2.5 px-3">TARGET OUTLET</th>
                    <th className="py-2.5 px-3">STATUS</th>
                    <th className="py-2.5 px-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/40">
                  {approvalsList.length > 0 ? (
                    approvalsList.map((req) => (
                      <tr key={req.id} className="hover:bg-paper-sunk/40">
                        <td className="py-2.5 px-3 text-ink font-semibold">{req.id}</td>
                        <td className="py-2.5 px-3">
                          <p className="text-ink font-semibold">{req.applicant_name}</p>
                          <p className="text-ash text-[11px]">{req.applicant_email}</p>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-signal">{req.request_type}</td>
                        <td className="py-2.5 px-3 text-ash">{req.target_outlet_id || 'HQ ENTERPRISE'}</td>
                        <td className="py-2.5 px-3 font-semibold">
                          <span className={req.status === 'APPROVED' ? 'text-gain' : (req.status === 'REJECTED' ? 'text-loss' : 'text-signal')}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-2">
                          {req.status === 'PENDING' ? (
                            <>
                              <button
                                onClick={() => handleApprovalAction(req.id, 'APPROVE')}
                                className="px-3 py-1 bg-gain text-paper font-semibold hover:bg-gain/90 cursor-pointer"
                              >
                                APPROVE ✓
                              </button>
                              <button
                                onClick={() => handleApprovalAction(req.id, 'REJECT')}
                                className="px-3 py-1 bg-loss text-paper font-semibold hover:bg-loss/90 cursor-pointer"
                              >
                                REJECT ✕
                              </button>
                            </>
                          ) : (
                            <span className={`px-2.5 py-1 border font-semibold text-[11px] ${
                              req.status === 'APPROVED' ? 'border-gain/40 bg-gain/10 text-gain' : 'border-loss/40 bg-loss/10 text-loss'
                            }`}>
                              {req.status === 'APPROVED' ? 'PROCESSED ✓' : 'REJECTED ✕'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-ash">NO PENDING REGISTRATION REQUESTS IN QUEUE.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Immutable Approval Audit Logs Section */}
            <div className="space-y-3 pt-6 border-t border-rule">
              <Eyebrow className="text-ash block font-mono">IMMUTABLE APPROVAL AUDIT LOGS ({auditLogsList.length})</Eyebrow>
              <div className="border border-rule bg-paper overflow-x-auto font-mono text-xs max-h-60">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-paper-sunk border-b border-rule text-ash">
                      <th className="py-2.5 px-3">LOG ID</th>
                      <th className="py-2.5 px-3">REQUEST ID</th>
                      <th className="py-2.5 px-3">APPROVER (ACTOR ID)</th>
                      <th className="py-2.5 px-3">DECISION</th>
                      <th className="py-2.5 px-3">COMMENTS</th>
                      <th className="py-2.5 px-3 text-right">TIMESTAMP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule/40">
                    {auditLogsList.length > 0 ? (
                      auditLogsList.map((log) => (
                        <tr key={log.id} className="hover:bg-paper-sunk/40">
                          <td className="py-2 px-3 text-ink font-semibold">{log.id}</td>
                          <td className="py-2 px-3 text-ash">{log.request_id}</td>
                          <td className="py-2 px-3 text-ink">{log.actor_id}</td>
                          <td className="py-2 px-3">
                            <span className={log.action === 'APPROVED' ? 'text-gain font-semibold' : 'text-loss font-semibold'}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-graphite">{log.comments || 'N/A'}</td>
                          <td className="py-2 px-3 text-right text-ash">{new Date(log.created_at).toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-ash">NO AUDIT LOGS RECORDED YET.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: DYNAMIC ROLES & RBAC */}
        {activeTab === 'roles' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center border-b border-rule pb-4">
              <h2 className="font-serif text-3xl text-ink">Dynamic Role-Based Access Control</h2>
              <Eyebrow className="text-signal block font-mono">DYNAMIC PERMISSION MATRIX</Eyebrow>
            </div>

            {/* Create Custom Role Form */}
            <form onSubmit={handleCreateRole} className="p-4 border border-rule bg-paper-sunk space-y-4 font-mono text-xs">
              <h3 className="font-serif text-xl text-ink">Create Dynamic Custom Role</h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  required
                  placeholder="ROLE NAME (E.G. STORE MANAGER, STOCK AUDITOR)"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="bg-paper border border-rule px-3 py-2 text-ink focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="ROLE DESCRIPTION"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="bg-paper border border-rule px-3 py-2 text-ink focus:outline-none"
                />
              </div>

              <div>
                <Eyebrow className="text-ash block mb-2">SELECT PERMISSION CODES</Eyebrow>
                <div className="grid grid-cols-3 gap-2 border border-rule bg-paper p-3 max-h-40 overflow-y-auto">
                  {permissionsList.map((p) => (
                    <label key={p.id} className="flex items-center space-x-2 text-[11px] text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPerms.includes(p.code)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedPerms([...selectedPerms, p.code]);
                          else setSelectedPerms(selectedPerms.filter((code) => code !== p.code));
                        }}
                      />
                      <span>{p.code}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="px-4 py-2 bg-ink text-paper font-semibold hover:bg-graphite">
                CREATE ROLE & BIND PERMISSIONS →
              </button>
            </form>

            {/* Existing Roles List */}
            <div className="border border-rule bg-paper overflow-x-auto font-mono text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-paper-sunk border-b border-rule text-ash">
                    <th className="py-2.5 px-3">ROLE ID</th>
                    <th className="py-2.5 px-3">ROLE NAME</th>
                    <th className="py-2.5 px-3">ASSIGNED PERMISSIONS</th>
                    <th className="py-2.5 px-3 text-right">TYPE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/40">
                  {rolesList.map((r) => (
                    <tr key={r.id} className="hover:bg-paper-sunk/40">
                      <td className="py-2.5 px-3 text-ink font-semibold">{r.id}</td>
                      <td className="py-2.5 px-3 text-ink font-semibold">{r.name}</td>
                      <td className="py-2.5 px-3 text-ash">
                        {r.permissions && r.permissions.length > 0 ? r.permissions.join(', ') : 'NONE'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-signal font-semibold">
                        {r.is_system_role ? 'SYSTEM' : 'CUSTOM'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 8: MULTI-OUTLET INVENTORY & STOCK TRANSFER */}
        {activeTab === 'outlets' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center border-b border-rule pb-4">
              <h2 className="font-serif text-3xl text-ink">Multi-Outlet Inventory Operations</h2>
              <Eyebrow className="text-signal block font-mono">STORE ISOLATED STOCK LEDGER</Eyebrow>
            </div>

            {/* Inter-Outlet Stock Transfer Form */}
            <form onSubmit={handleTransferStock} className="p-4 border border-rule bg-paper-sunk space-y-4 font-mono text-xs">
              <h3 className="font-serif text-xl text-ink">Atomic Inter-Outlet Stock Transfer</h3>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Eyebrow className="text-ash block mb-1">SOURCE OUTLET</Eyebrow>
                  <select
                    value={transferSourceOutlet}
                    onChange={(e) => setTransferSourceOutlet(e.target.value)}
                    className="w-full bg-paper border border-rule px-3 py-2 text-ink uppercase focus:outline-none"
                  >
                    <option value="out_fsd_01">FLASH ENGINE FSD (FSD-01)</option>
                    <option value="out_lhr_01">FLASH ENGINE LHR (LHR-01)</option>
                  </select>
                </div>
                <div>
                  <Eyebrow className="text-ash block mb-1">TARGET OUTLET</Eyebrow>
                  <select
                    value={transferTargetOutlet}
                    onChange={(e) => setTransferTargetOutlet(e.target.value)}
                    className="w-full bg-paper border border-rule px-3 py-2 text-ink uppercase focus:outline-none"
                  >
                    <option value="out_fsd_01">FLASH ENGINE FSD (FSD-01)</option>
                    <option value="out_lhr_01">FLASH ENGINE LHR (LHR-01)</option>
                  </select>
                </div>
                <div>
                  <Eyebrow className="text-ash block mb-1">PRODUCT SKU</Eyebrow>
                  <input
                    type="text"
                    required
                    value={transferSku}
                    onChange={(e) => setTransferSku(e.target.value.toUpperCase())}
                    className="w-full bg-paper border border-rule px-3 py-2 text-ink uppercase focus:outline-none"
                  />
                </div>
                <div>
                  <Eyebrow className="text-ash block mb-1">TRANSFER QTY</Eyebrow>
                  <input
                    type="number"
                    min="1"
                    required
                    value={transferQty}
                    onChange={(e) => setTransferQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-paper border border-rule px-3 py-2 text-ink focus:outline-none"
                  />
                </div>
              </div>
              <button type="submit" className="px-4 py-2 bg-ink text-paper font-semibold hover:bg-graphite">
                EXECUTE ATOMIC STOCK TRANSFER →
              </button>
            </form>

            {/* Store Inventory Table */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Eyebrow className="text-ash block">STORE INVENTORY POOL ({selectedOutletId})</Eyebrow>
                <select
                  value={selectedOutletId}
                  onChange={(e) => setSelectedOutletId(e.target.value)}
                  className="bg-paper-sunk border border-rule px-3 py-1 text-ink font-mono text-xs uppercase"
                >
                  <option value="out_fsd_01">FLASH ENGINE FSD (FSD-01)</option>
                  <option value="out_lhr_01">FLASH ENGINE LHR (LHR-01)</option>
                </select>
              </div>

              <div className="border border-rule bg-paper overflow-x-auto font-mono text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-paper-sunk border-b border-rule text-ash">
                      <th className="py-2.5 px-3">INVENTORY ID</th>
                      <th className="py-2.5 px-3">PRODUCT SKU</th>
                      <th className="py-2.5 px-3">PRODUCT NAME</th>
                      <th className="py-2.5 px-3">AVAILABLE QTY</th>
                      <th className="py-2.5 px-3">HELD QTY</th>
                      <th className="py-2.5 px-3 text-right">REORDER LEVEL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule/40">
                    {outletInventories.length > 0 ? (
                      outletInventories.map((inv) => (
                        <tr key={inv.id} className="hover:bg-paper-sunk/40">
                          <td className="py-2.5 px-3 text-ink font-semibold">{inv.id}</td>
                          <td className="py-2.5 px-3 font-semibold text-signal">{inv.product_sku}</td>
                          <td className="py-2.5 px-3 font-sans font-medium text-ink">
                            {products.find(p => p.sku === inv.product_sku)?.name || inv.product_name || inv.product_sku}
                          </td>
                          <td className="py-2.5 px-3 text-gain font-semibold">{inv.quantity_available} UNITS</td>
                          <td className="py-2.5 px-3 text-loss font-semibold">{inv.quantity_held} HELD</td>
                          <td className="py-2.5 px-3 text-right text-ash">{inv.reorder_level} UNITS</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-ash">NO INVENTORY RECORDS FOR OUTLET '{selectedOutletId}'.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>


      {/* 📦 EDIT PRODUCT & STOCK MODAL */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/60" onClick={() => setEditProduct(null)} />
          <div className="relative w-full max-w-md bg-paper border border-rule p-6 space-y-4 font-mono text-xs z-10">
            <div className="border-b border-rule pb-3 flex justify-between items-center">
              <h3 className="font-serif text-2xl text-ink">Update Product & Stock</h3>
              <button onClick={() => setEditProduct(null)} className="text-ash hover:text-ink font-mono text-xs">✕</button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-4">
              <div className="space-y-1">
                <Eyebrow className="text-ash block">PRODUCT NAME</Eyebrow>
                <input
                  type="text"
                  required
                  value={editProdName}
                  onChange={(e) => setEditProdName(e.target.value)}
                  className="w-full bg-paper-sunk border border-rule px-3 py-2 text-ink focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Eyebrow className="text-ash block">PRICE ($)</Eyebrow>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={editProdPrice}
                    onChange={(e) => setEditProdPrice(Math.max(0.01, parseFloat(e.target.value) || 0))}
                    className="w-full bg-paper-sunk border border-rule px-3 py-2 text-ink focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <Eyebrow className="text-ash block">DISCOUNT (%)</Eyebrow>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editProdDiscountPct}
                    onChange={(e) => setEditProdDiscountPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full bg-paper-sunk border border-rule px-3 py-2 text-ink focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <Eyebrow className="text-ash block">STOCK (UNITS)</Eyebrow>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editProdStock}
                    onChange={(e) => setEditProdStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-paper-sunk border border-rule px-3 py-2 text-ink font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Eyebrow className="text-ash block">ASSIGN CATEGORY</Eyebrow>
                <select
                  value={editProdCatId}
                  onChange={(e) => setEditProdCatId(e.target.value)}
                  className="w-full bg-paper-sunk border border-rule px-3 py-2 text-ink focus:outline-none"
                >
                  <option value="">NO CATEGORY / GENERAL</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Eyebrow className="text-ash block">ASSIGN VENDOR</Eyebrow>
                <select
                  value={editProdVendorId}
                  onChange={(e) => setEditProdVendorId(e.target.value)}
                  className="w-full bg-paper-sunk border border-rule px-3 py-2 text-ink focus:outline-none"
                >
                  <option value="">NO VENDOR / CENTRAL OUTLET</option>
                  {usersList.filter((u) => u.role === 'vendor').map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>{vendor.full_name || vendor.email}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-rule space-y-3">
                <div className="flex items-center justify-between">
                  <Eyebrow className="text-ash block">ADD VARIANT</Eyebrow>
                  <span className="text-[11px] text-ash font-mono">{editProduct.variants?.length || 0} EXISTING</span>
                </div>
                <form onSubmit={handleCreateVariant} className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="VARIANT SKU"
                    value={variantSku}
                    onChange={(e) => setVariantSku(e.target.value)}
                    className="bg-paper-sunk border border-rule px-3 py-2 text-ink focus:outline-none"
                  />
                  <input
                    type="text"
                    required
                    placeholder="VARIANT NAME"
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                    className="bg-paper-sunk border border-rule px-3 py-2 text-ink focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="COLOR"
                    value={variantColor}
                    onChange={(e) => setVariantColor(e.target.value)}
                    className="bg-paper-sunk border border-rule px-3 py-2 text-ink focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="SIZE"
                    value={variantSize}
                    onChange={(e) => setVariantSize(e.target.value)}
                    className="bg-paper-sunk border border-rule px-3 py-2 text-ink focus:outline-none"
                  />
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="PRICE"
                    value={variantPrice || ''}
                    onChange={(e) => setVariantPrice(Math.max(0.01, parseFloat(e.target.value) || 0))}
                    className="bg-paper-sunk border border-rule px-3 py-2 text-ink focus:outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="STOCK"
                    value={variantStock || ''}
                    onChange={(e) => setVariantStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="bg-paper-sunk border border-rule px-3 py-2 text-ink focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingVariant}
                    className="col-span-2 px-4 py-2 bg-signal text-paper font-semibold hover:bg-signal/90 disabled:opacity-50"
                  >
                    {isCreatingVariant ? 'CREATING VARIANT...' : 'CREATE VARIANT →'}
                  </button>
                </form>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditProduct(null)}
                  className="px-4 py-2 border border-rule bg-paper text-ink hover:bg-paper-sunk"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProduct}
                  className="px-4 py-2 bg-ink text-paper font-semibold hover:bg-graphite disabled:opacity-50"
                >
                  {isUpdatingProduct ? 'SAVING...' : 'UPDATE & SYNC STOCK →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚢 SHIP MODAL */}
      {shippingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/60" onClick={() => setShippingModalOrder(null)} />
          <div className="relative w-full max-w-md bg-paper border border-rule p-6 space-y-4 font-mono text-xs z-10">
            <div className="border-b border-rule pb-3 flex justify-between items-center">
              <h3 className="font-serif text-2xl text-ink">Ship Order ORD-{shippingModalOrder.id.slice(0, 8).toUpperCase()}</h3>
              <button onClick={() => setShippingModalOrder(null)} className="text-ash hover:text-ink font-mono text-xs">✕</button>
            </div>

            <form onSubmit={handleConfirmShip} className="space-y-4">
              <div className="space-y-1">
                <Eyebrow className="text-ash block">CARRIER NAME</Eyebrow>
                <input
                  type="text"
                  required
                  placeholder="E.G. FEDEX, DHL, UPS, USPS"
                  value={shipCarrier}
                  onChange={(e) => setShipCarrier(e.target.value.toUpperCase())}
                  className="w-full bg-paper-sunk border border-rule px-3 py-2 text-ink uppercase focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <Eyebrow className="text-ash block">TRACKING NUMBER</Eyebrow>
                <input
                  type="text"
                  required
                  placeholder="E.G. TRK-84920194US"
                  value={shipTrackingNum}
                  onChange={(e) => setShipTrackingNum(e.target.value.toUpperCase())}
                  className="w-full bg-paper-sunk border border-rule px-3 py-2 text-ink uppercase focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShippingModalOrder(null)}
                  className="px-4 py-2 border border-rule bg-paper text-ink hover:bg-paper-sunk"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-ink text-paper font-semibold hover:bg-graphite"
                >
                  SAVE & MARK SHIPPED →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 💸 REFUND CONFIRMATION MODAL */}
      {refundModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/60" onClick={() => setRefundModalOrder(null)} />
          <div className="relative w-full max-w-md bg-paper border border-loss p-6 space-y-4 font-mono text-xs z-10">
            <div className="border-b border-loss pb-3 flex justify-between items-center">
              <h3 className="font-serif text-2xl text-loss">Confirm Order Refund</h3>
              <button onClick={() => setRefundModalOrder(null)} className="text-ash hover:text-ink font-mono text-xs">✕</button>
            </div>

            <p className="text-ink">
              Are you sure you want to refund <strong className="text-loss">${(refundModalOrder.total_amount || 0).toFixed(2)}</strong> for Order <strong className="text-ink">ORD-{refundModalOrder.id.slice(0, 8).toUpperCase()}</strong> to customer <strong className="text-ink">{(refundModalOrder as any).user_email || 'guest@flashsale.com'}</strong>?
            </p>
            <p className="text-ash text-[11px]">
              This action will trigger an immediate refund via Stripe / Gateway and mark the order as REFUNDED. This action cannot be undone.
            </p>

            <div className="pt-2 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setRefundModalOrder(null)}
                className="px-4 py-2 border border-rule bg-paper text-ink hover:bg-paper-sunk"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                className="px-4 py-2 bg-loss text-paper font-semibold hover:opacity-90"
              >
                CONFIRM REFUND →
              </button>
            </div>
          </div>
        </div>
      )}



      {/* 📄 ORDER DETAIL DRAWER / MODAL */}
      {detailModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-ink/60" onClick={() => setDetailModalOrder(null)} />
          <div className="relative w-full max-w-2xl bg-paper border border-rule p-6 space-y-6 font-mono text-xs max-h-[90vh] overflow-y-auto z-10">
            <div className="border-b border-rule pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-serif text-3xl text-ink">Order ORD-{detailModalOrder.id.slice(0, 12).toUpperCase()}</h3>
                <span className="text-ash text-[11px]">RECORDED ON {detailModalOrder.created_at ? new Date(detailModalOrder.created_at).toUTCString().toUpperCase() : 'N/A'}</span>
              </div>
              <button onClick={() => setDetailModalOrder(null)} className="text-ash hover:text-ink text-sm">✕</button>
            </div>

            {/* Customer & Shipping Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-rule p-4 bg-paper-sunk">
              <div className="space-y-1">
                <Eyebrow className="text-ash block">CUSTOMER DETAILS</Eyebrow>
                <p className="font-semibold text-ink">{(detailModalOrder as any).user_full_name || 'Guest Customer'}</p>
                <p className="text-graphite">{(detailModalOrder as any).user_email || 'guest@flashsale.com'}</p>
              </div>

              <div className="space-y-1">
                <Eyebrow className="text-ash block">SHIPPING DESTINATION</Eyebrow>
                {(detailModalOrder as any).shipping_address ? (
                  <div className="text-graphite">
                    <p className="font-semibold text-ink">{(detailModalOrder as any).shipping_address.recipient_name}</p>
                    <p>{(detailModalOrder as any).shipping_address.address_line1}</p>
                    <p>{(detailModalOrder as any).shipping_address.city}, {(detailModalOrder as any).shipping_address.state} {(detailModalOrder as any).shipping_address.postal_code}</p>
                    <p className="text-ash">{(detailModalOrder as any).shipping_address.country}</p>
                    {(detailModalOrder as any).shipping_address.phone && (
                      <p className="text-signal font-mono font-semibold mt-1">TEL: {(detailModalOrder as any).shipping_address.phone}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-ash">STANDARD EXPRESS SHIPPING</p>
                )}
              </div>
            </div>

            {/* Itemized Line Items Table */}
            <div className="space-y-2">
              <Eyebrow className="text-ash block">ORDERED ITEMS ({detailModalOrder.items?.length || 1})</Eyebrow>
              <div className="border border-rule bg-paper">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-paper-sunk border-b border-rule text-ash">
                      <th className="py-2 px-3">PRODUCT</th>
                      <th className="py-2 px-3">VARIANT</th>
                      <th className="py-2 px-3 text-center">QTY</th>
                      <th className="py-2 px-3 text-right">UNIT PRICE</th>
                      <th className="py-2 px-3 text-right">SUBTOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule/30">
                    {detailModalOrder.items && detailModalOrder.items.length > 0 ? (
                      detailModalOrder.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-semibold text-ink">{item.product_name || `Product #${item.product_id?.slice(0, 8)}`}</td>
                          <td className="py-2 px-3 text-ash">{item.variant_name || item.variant_sku || 'DEFAULT'}</td>
                          <td className="py-2 px-3 text-center text-ink">{item.quantity}</td>
                          <td className="py-2 px-3 text-right text-ink">${Number(item.unit_price || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-semibold text-ink">${Number(item.subtotal || 0).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-2 px-3 font-semibold text-ink">Product #{(detailModalOrder as any).product_id?.slice(0, 8) || 'N/A'}</td>
                        <td className="py-2 px-3 text-ash">STANDARD</td>
                        <td className="py-2 px-3 text-center text-ink">{(detailModalOrder as any).quantity || 1}</td>
                        <td className="py-2 px-3 text-right text-ink">${Number((detailModalOrder as any).unit_price || 0).toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-ink">${Number(detailModalOrder.total_amount || 0).toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Metadata */}
            <div className="border border-rule p-4 bg-paper space-y-2">
              <div className="flex justify-between">
                <span className="text-ash">SUBTOTAL</span>
                <span>${Number((detailModalOrder.total_amount || 0) - ((detailModalOrder as any).tax || 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ash">TAX</span>
                <span>${Number((detailModalOrder as any).tax || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-rule pt-2 font-semibold text-ink text-sm">
                <span>TOTAL AMOUNT</span>
                <span>${Number(detailModalOrder.total_amount || 0).toFixed(2)}</span>
              </div>
              <div className="text-[11px] text-ash pt-1 flex flex-wrap justify-between gap-2 border-t border-rule/30">
                <span>STATUS: <strong className="text-ink">{detailModalOrder.status}</strong></span>
                <span>PAYMENT INTENT: <strong className="text-ink">{(detailModalOrder as any).payment_intent_id || 'N/A (SANDBOX)'}</strong></span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDetailModalOrder(null)}
                className="px-6 py-2 bg-ink text-paper font-semibold hover:bg-graphite"
              >
                CLOSE LEDGER VIEW
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
