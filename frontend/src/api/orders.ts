import { apiFetch } from './client';
import { Order } from '../types/api';

export interface CheckoutResponse {
  message: string;
  order: Order;
  task_id?: string;
  status_url?: string;
}

export interface PaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
}

export const ordersApi = {
  async checkout(idempotencyKey: string, couponCode?: string, shippingAddressId?: string): Promise<CheckoutResponse> {
    return apiFetch<CheckoutResponse>('/orders/checkout', {
      method: 'POST',
      idempotencyKey,
      body: JSON.stringify({ coupon_code: couponCode, shipping_address_id: shippingAddressId }),
    });
  },

  async guestCheckout(
    guestEmail: string,
    items: Array<{ product_id: string; variant_id?: string; quantity: number }>,
    idempotencyKey: string,
    couponCode?: string,
    shippingAddress?: any
  ): Promise<CheckoutResponse> {
    return apiFetch<CheckoutResponse>('/orders/guest-checkout', {
      method: 'POST',
      idempotencyKey,
      body: JSON.stringify({ email: guestEmail, items, coupon_code: couponCode, shipping_address: shippingAddress }),
    });
  },

  async createPaymentIntent(order_id: string, currency = 'usd'): Promise<PaymentIntentResponse> {
    return apiFetch<PaymentIntentResponse>('/orders/payments/intent', {
      method: 'POST',
      body: JSON.stringify({ order_id, currency }),
    });
  },

  async listUserOrders(): Promise<Order[]> {
    return apiFetch<Order[]>('/orders');
  },

  async getOrder(order_id: string): Promise<Order> {
    return apiFetch<Order>(`/orders/${order_id}`);
  },

  async cancelOrder(order_id: string): Promise<{ message: string; order_id: string; status: string }> {
    return apiFetch<{ message: string; order_id: string; status: string }>(`/orders/${order_id}/cancel`, {
      method: 'POST',
    });
  },

  async restoreOrderToCart(order_id: string): Promise<{ message: string; order_id: string; status: string }> {
    return apiFetch<{ message: string; order_id: string; status: string }>(`/orders/${order_id}/restore-cart`, {
      method: 'POST',
    });
  },

  async payOrder(order_id: string): Promise<{ status: string; message: string; order_id: string }> {
    return apiFetch<{ status: string; message: string; order_id: string }>(`/orders/${order_id}/pay`, {
      method: 'POST',
    });
  },
};
