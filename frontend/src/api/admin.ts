import { apiFetch } from './client';
import { Product, Category, Coupon, Order, User } from '../types/api';

export interface FinancialPeriodMetrics {
  gmv: number;
  net_revenue: number;
  settled_payouts: number;
}

export interface FinancialReporting {
  h24: FinancialPeriodMetrics;
  mtd: FinancialPeriodMetrics;
  ytd: FinancialPeriodMetrics;
  annual: FinancialPeriodMetrics;
  arr_run_rate: number;
}

export interface EscrowRisk {
  total_escrow_balance: number;
  active_holds_count: number;
  aging_holds_count: number;
  aging_holds_amount: number;
  disputed_funds: number;
  refund_rate_pct: number;
  avg_hold_duration_days: number;
  pending_clearance: number;
}

export interface PipelineHealth {
  outbox_queue_depth: number;
  ingestion_rate_msg_s: number;
  consumer_rate_msg_s: number;
  dlq_count: number;
  redis_hits_s: number;
  outbox_lag_sec: number;
  lag_status: string;
}

export interface SystemStats {
  total_products: number;
  total_orders: number;
  orders_24h?: number;
  revenue_24h?: number;
  aov?: number;
  active_holds?: number;
  redis_hits?: number;
  outbox_lag?: number;
  pending_orders: number;
  paid_orders: number;
  expired_orders: number;
  total_users: number;
  outbox_pending: number;
  outbox_published: number;
  financial_reporting?: FinancialReporting;
  escrow_risk?: EscrowRisk;
  pipeline_health?: PipelineHealth;
}

export interface OutboxEventItem {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload: any;
  status: string;
  created_at: string;
}

export interface TaskLogItem {
  id: string;
  task_name: string;
  status: string;
  result?: string;
  error?: string;
  created_at: string;
}

export const adminApi = {
  async getStats(): Promise<SystemStats> {
    return apiFetch<SystemStats>('/admin/stats');
  },

  async getAdminOrders(status?: string): Promise<Order[]> {
    const endpoint = status ? `/admin/orders?status=${status}` : '/admin/orders';
    return apiFetch<Order[]>(endpoint);
  },

  async updateOrder(
    order_id: string,
    data: { status?: string; tracking_number?: string; carrier?: string }
  ): Promise<{ message: string; order: Order; refund?: any }> {
    return apiFetch<{ message: string; order: Order; refund?: any }>(`/admin/orders/${order_id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async listUsers(): Promise<User[]> {
    return apiFetch<User[]>('/admin/users');
  },

  async deleteUser(userId: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async listTaskLogs(): Promise<TaskLogItem[]> {
    return apiFetch<TaskLogItem[]>('/admin/task-logs');
  },

  async getOutboxEvents(): Promise<OutboxEventItem[]> {
    return apiFetch<OutboxEventItem[]>('/admin/outbox');
  },

  async createProduct(data: {
    name: string;
    sku: string;
    price: number;
    total_stock: number;
    description?: string;
    images?: string[];
    category_id?: string;
    vendor_id?: string;
  }): Promise<Product> {
    return apiFetch<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProduct(productId: string, data: Partial<Product>): Promise<Product> {
    return apiFetch<Product>(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteProduct(productId: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/products/${productId}`, {
      method: 'DELETE',
    });
  },

  async createVariant(
    productId: string,
    data: {
      sku: string;
      name: string;
      price: number;
      size?: string;
      color?: string;
      total_stock?: number;
      available_stock?: number;
    }
  ): Promise<any> {
    return apiFetch<any>(`/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteVariant(productId: string, variantId: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/products/${productId}/variants/${variantId}`, {
      method: 'DELETE',
    });
  },

  async createCategory(data: { name: string; slug?: string; description?: string }): Promise<Category> {
    return apiFetch<Category>('/products/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCategory(categoryId: string, data: { name?: string; description?: string }): Promise<Category> {
    return apiFetch<Category>(`/products/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteCategory(categoryId: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/products/categories/${categoryId}`, {
      method: 'DELETE',
    });
  },

  async listCoupons(): Promise<Coupon[]> {
    return apiFetch<Coupon[]>('/coupons');
  },

  async createCoupon(data: {
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    min_order_amount?: number;
    usage_limit?: number;
    max_uses_per_user?: number;
    valid_days?: number;
  }): Promise<Coupon> {
    return apiFetch<Coupon>('/coupons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async toggleCoupon(couponId: string): Promise<{ message: string; coupon: Coupon }> {
    return apiFetch<{ message: string; coupon: Coupon }>(`/coupons/${couponId}/toggle`, {
      method: 'PATCH',
    });
  },

  async deleteCoupon(couponId: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/coupons/${couponId}`, {
      method: 'DELETE',
    });
  },

  async syncProductStock(productId: string): Promise<{ message: string; details: any }> {
    return apiFetch<{ message: string; details: any }>(`/products/${productId}/sync-stock`, {
      method: 'POST',
    });
  },

  // --- Registration Approvals ---
  async getApprovals(status = 'PENDING'): Promise<any[]> {
    return apiFetch<any[]>(`/admin/approvals?status=${status}`);
  },

  async getApprovalAuditLogs(): Promise<any[]> {
    return apiFetch<any[]>('/admin/approvals/audit-logs');
  },

  async processApprovalAction(requestId: string, data: { action: 'APPROVE' | 'REJECT'; comments?: string }): Promise<any> {
    return apiFetch<any>(`/admin/approvals/${requestId}/action`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // --- Dynamic RBAC & Roles ---
  async getPermissions(): Promise<any[]> {
    return apiFetch<any[]>('/admin/permissions');
  },

  async getRoles(): Promise<any[]> {
    return apiFetch<any[]>('/admin/roles');
  },

  async createRole(data: { name: string; description?: string; permissions?: string[] }): Promise<any> {
    return apiFetch<any>('/admin/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteRole(roleId: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/admin/roles/${roleId}`, {
      method: 'DELETE',
    });
  },

  async assignUserRoles(userId: string, data: { role_ids: string[]; outlet_ids: string[] }): Promise<any> {
    return apiFetch<any>(`/admin/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // --- Multi-Outlet Inventory ---
  async getOutletInventory(outletId: string): Promise<any[]> {
    return apiFetch<any[]>(`/outlets/${outletId}/inventory`);
  },

  async adjustOutletStock(outletId: string, data: { product_sku: string; quantity_delta: number; reorder_level?: number }): Promise<any> {
    return apiFetch<any>(`/outlets/${outletId}/inventory/adjust`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async transferStock(data: { source_outlet_id: string; target_outlet_id: string; product_sku: string; quantity: number }): Promise<any> {
    return apiFetch<any>('/outlets/inventory/transfer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // --- Merchant Seller Management ---
  async getSellers(status?: string): Promise<any[]> {
    const q = status ? `?status=${status}` : '';
    return apiFetch<any[]>(`/admin/sellers${q}`);
  },

  async updateSellerStatus(sellerId: string, status: 'APPROVED' | 'SUSPENDED' | 'REJECTED' | 'PENDING'): Promise<any> {
    return apiFetch<any>(`/admin/sellers/${sellerId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async reviewSellerKyc(sellerId: string, docId: string, status: 'VERIFIED' | 'REJECTED'): Promise<any> {
    return apiFetch<any>(`/admin/sellers/${sellerId}/kyc/${docId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // --- Merchant Payout Clearinghouse ---
  async getPayouts(status?: string): Promise<any[]> {
    const q = status ? `?status=${status}` : '';
    return apiFetch<any[]>(`/admin/payouts${q}`);
  },

  async updatePayoutStatus(payoutId: string, status: 'PROCESSING' | 'PAID' | 'REJECTED'): Promise<any> {
    return apiFetch<any>(`/admin/payouts/${payoutId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async getFinancialLedger(): Promise<any[]> {
    return apiFetch<any[]>('/admin/ledger');
  },
};
