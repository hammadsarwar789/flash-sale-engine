export interface ProductVariant {
  id: string;
  product_id?: string;
  sku: string;
  title: string;
  attributes: Record<string, string>;
  price: number;
  sale_price?: number;
  total_stock?: number;
  available_stock: number;
  // Legacy / convenience fields
  name?: string;
  size?: string;
  color?: string;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  parent_id?: string;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  sale_price?: number;
  discount_percentage?: number;
  total_stock: number;
  available_stock: number;
  category_id?: string;
  category?: Category | string;
  vendor_id?: string;
  vendor_name?: string;
  seller_id?: string;
  seller_name?: string;
  seller_slug?: string;
  images: string[];
  is_active: boolean;
  variants?: ProductVariant[];
  created_at?: string;
}

export function computeProductPoolStock(product: Product): number {
  if (product.variants && product.variants.length > 0) {
    return product.variants.reduce((sum, v) => sum + (v.available_stock || 0), 0);
  }
  return product.available_stock ?? product.total_stock ?? 0;
}
