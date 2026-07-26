import { useQuery } from '@tanstack/react-query';
import { productsApi, ProductQuery } from '../api/products';

export function useProducts(params: ProductQuery = {}) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productsApi.getProducts(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useProductDetail(productId: string | undefined) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.getProduct(productId!),
    enabled: !!productId,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.getCategories(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useProductVariants(productId: string | undefined) {
  return useQuery({
    queryKey: ['productVariants', productId],
    queryFn: () => productsApi.getProductVariants(productId!),
    enabled: !!productId,
  });
}

export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ['productReviews', productId],
    queryFn: () => productsApi.getProductReviews(productId!),
    enabled: !!productId,
  });
}
