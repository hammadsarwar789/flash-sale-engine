import { apiFetch } from './client';

export interface SellerProfile {
  id: string;
  owner_user_id: string;
  owner_name: string;
  owner_email?: string;
  store_name: string;
  store_slug: string;
  business_registration_no?: string;
  tax_id?: string;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
  commission_rate: number;
  payout_method: string;
  payout_account_ref?: string;
  created_at: string;
  kyc_documents?: Array<{
    id: string;
    doc_type: string;
    file_url: string;
    status: string;
  }>;
}

export interface VendorSubOrder {
  id: string;
  order_id: string;
  seller_id: string;
  seller_name: string;
  status: 'PENDING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
  subtotal: number;
  commission_amount: number;
  seller_payout_amount: number;
  shipment_id?: string;
  created_at: string;
  items: Array<{
    id: string;
    product_id: string;
    product_name: string;
    variant_name?: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
}

export interface VendorFinanceSummary {
  seller_id: string;
  store_name: string;
  commission_rate: number;
  escrow_held_balance: number;
  available_payout_balance: number;
  total_payouts_processed: number;
  pending_payouts_requested: number;
  ledger: Array<{
    id: string;
    sub_order_id: string;
    entry_type: string;
    amount: number;
    status: string;
    created_at: string;
  }>;
  payout_requests: Array<{
    id: string;
    amount: number;
    status: string;
    requested_at: string;
    processed_at?: string;
  }>;
}

export const vendorApi = {
  async submitOnboarding(data: {
    store_name: string;
    store_slug: string;
    business_registration_no?: string;
    tax_id?: string;
    payout_method?: string;
    payout_account_ref?: string;
    kyc_documents?: Array<{ doc_type: string; file_url: string }>;
  }): Promise<{ message: string; seller: SellerProfile }> {
    return apiFetch<{ message: string; seller: SellerProfile }>('/vendor/onboarding', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getProfile(): Promise<{ has_seller_account: boolean; seller?: SellerProfile }> {
    return apiFetch<{ has_seller_account: boolean; seller?: SellerProfile }>('/vendor/profile');
  },

  async getSubOrders(status?: string): Promise<VendorSubOrder[]> {
    const q = status ? `?status=${status}` : '';
    return apiFetch<VendorSubOrder[]>(`/vendor/sub-orders${q}`);
  },

  async updateSubOrderStatus(subOrderId: string, status: string): Promise<{ message: string; sub_order: VendorSubOrder }> {
    return apiFetch<{ message: string; sub_order: VendorSubOrder }>(`/vendor/sub-orders/${subOrderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async getFinance(): Promise<VendorFinanceSummary> {
    return apiFetch<VendorFinanceSummary>('/vendor/finance');
  },

  async requestPayout(amount: number): Promise<{ message: string; payout_request: any }> {
    return apiFetch<{ message: string; payout_request: any }>('/vendor/payouts', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  async getCarriers(): Promise<Array<{ id: string; name: string; api_identifier?: string }>> {
    return apiFetch<Array<{ id: string; name: string; api_identifier?: string }>>('/logistics/carriers');
  },

  async createShipment(data: { sub_order_id: string; carrier_id?: string; tracking_number?: string }): Promise<any> {
    return apiFetch<any>('/logistics/shipments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
