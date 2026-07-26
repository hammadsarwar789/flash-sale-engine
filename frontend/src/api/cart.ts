import { apiFetch } from './client';
import { Cart, CartItem } from '../types/api';

export const cartApi = {
  async getCart(): Promise<Cart> {
    return apiFetch<Cart>('/cart');
  },

  async addToCart(data: { product_id: string; variant_id?: string; quantity?: number }): Promise<CartItem> {
    return apiFetch<CartItem>('/cart/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCartItem(item_id: string, quantity: number): Promise<CartItem> {
    return apiFetch<CartItem>(`/cart/items/${item_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
  },

  async deleteCartItem(item_id: string): Promise<{ message: string; item_id: string }> {
    return apiFetch<{ message: string; item_id: string }>(`/cart/items/${item_id}`, {
      method: 'DELETE',
    });
  },

  async clearCart(): Promise<{ message: string }> {
    return apiFetch<{ message: string }>('/cart', {
      method: 'DELETE',
    });
  },
};
