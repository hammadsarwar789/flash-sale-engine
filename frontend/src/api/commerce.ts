import { apiFetch } from './client';
import { CouponValidation, Review, WishlistItem, ShippingAddress } from '../types/api';

export const commerceApi = {
  async validateCoupon(code: string, amount: number): Promise<CouponValidation> {
    return apiFetch<CouponValidation>('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, amount }),
    });
  },

  async checkReviewEligibility(productId: string): Promise<{ eligible: boolean; message: string }> {
    return apiFetch<{ eligible: boolean; message: string }>(`/products/${productId}/review-eligibility`);
  },

  async addReview(
    productId: string,
    data: { rating: number; title?: string; comment?: string }
  ): Promise<Review> {
    return apiFetch<Review>(`/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getWishlist(): Promise<WishlistItem[]> {
    return apiFetch<WishlistItem[]>('/wishlist');
  },

  async addToWishlist(product_id: string): Promise<WishlistItem> {
    return apiFetch<WishlistItem>('/wishlist/items', {
      method: 'POST',
      body: JSON.stringify({ product_id }),
    });
  },

  async removeFromWishlist(item_id: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/wishlist/items/${item_id}`, {
      method: 'DELETE',
    });
  },

  async listShippingAddresses(): Promise<ShippingAddress[]> {
    return apiFetch<ShippingAddress[]>('/shipping-addresses');
  },

  async createShippingAddress(data: ShippingAddress): Promise<ShippingAddress> {
    return apiFetch<ShippingAddress>('/shipping-addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
