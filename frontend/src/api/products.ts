import { apiFetch } from './client';
import { Product, Category, ProductVariant, Review } from '../types/api';

export interface ProductQuery {
  search?: string;
  category_id?: string;
  sort_by?: 'price_asc' | 'price_desc' | 'created_at' | string;
  page?: number;
  per_page?: number;
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
}

export const productsApi = {
  async getProducts(params: ProductQuery = {}): Promise<PaginatedProducts> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category_id) query.append('category_id', params.category_id);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.page) query.append('page', params.page.toString());
    if (params.per_page) query.append('per_page', params.per_page.toString());

    const queryString = query.toString();
    const endpoint = queryString ? `/products?${queryString}` : '/products';
    return apiFetch<PaginatedProducts>(endpoint);
  },

  async getProduct(id: string): Promise<Product> {
    return apiFetch<Product>(`/products/${id}`);
  },

  async getCategories(): Promise<Category[]> {
    return apiFetch<Category[]>('/products/categories');
  },

  async getProductVariants(productId: string): Promise<ProductVariant[]> {
    return apiFetch<ProductVariant[]>(`/products/${productId}/variants`);
  },

  async getProductReviews(productId: string): Promise<Review[]> {
    return apiFetch<Review[]>(`/products/${productId}/reviews`);
  },

  async toggleShopifyListing(productId: string, isListed: boolean): Promise<Product> {
    return apiFetch<Product>(`/products/${productId}/shopify-listing`, {
      method: 'PATCH',
      body: JSON.stringify({ is_listed_on_shopify: isListed }),
    });
  },

  async deleteProductFromShopify(productId: string): Promise<any> {
    return apiFetch<any>(`/products/${productId}/shopify`, {
      method: 'DELETE',
    });
  },
};
