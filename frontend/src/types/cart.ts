import { Product, ProductVariant } from './product';

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  product?: Product;
  variant?: ProductVariant;
  unit_price: number;
  subtotal: number;
  product_name?: string;
  variant_name?: string;
  variant_sku?: string;
  image_url?: string;
  created_at?: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  item_count: number;
  expires_at?: string | null;
}

export const MAX_PER_ORDER = 10;
