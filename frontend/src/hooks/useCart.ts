import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/cart';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MAX_PER_ORDER } from '../types/cart';

export function useCart() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.getCart(),
    enabled: isAuthenticated,
    staleTime: 1000 * 30, // 30 seconds
  });

  const addToCartMutation = useMutation({
    mutationFn: async (data: { product_id: string; variant_id?: string; quantity?: number; max_stock?: number }) => {
      let qty = data.quantity ?? 1;
      const limit = data.max_stock !== undefined ? Math.min(data.max_stock, MAX_PER_ORDER) : MAX_PER_ORDER;
      if (data.max_stock !== undefined && qty > limit) {
        qty = limit;
        toast.warning(`Quantity automatically clamped to maximum available pool (${limit} available)`);
      }
      return cartApi.addToCart({
        product_id: data.product_id,
        variant_id: data.variant_id,
        quantity: qty,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (err: any) => {
      const detail = err.detail || err.message || 'Failed to add item to cart';
      toast.error(detail);
    },
  });

  const updateCartItemMutation = useMutation({
    mutationFn: async ({ item_id, quantity, max_stock }: { item_id: string; quantity: number; max_stock?: number }) => {
      let qty = quantity;
      if (max_stock !== undefined) {
        const limit = Math.min(max_stock, MAX_PER_ORDER);
        if (qty > limit) {
          qty = limit;
          toast.info(`Maximum available stock reached (${max_stock} available in pool)`);
        }
      }
      return cartApi.updateCartItem(item_id, qty);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (err: any) => {
      const detail = err.detail || err.message || 'Failed to update item quantity';
      toast.error(detail);
    },
  });

  const deleteCartItemMutation = useMutation({
    mutationFn: (item_id: string) => cartApi.deleteCartItem(item_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: () => cartApi.clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  return {
    cart: cartQuery.data,
    isLoading: cartQuery.isLoading,
    isError: cartQuery.isError,
    error: cartQuery.error,
    refetchCart: cartQuery.refetch,
    addToCart: addToCartMutation.mutateAsync,
    isAddingToCart: addToCartMutation.isPending,
    updateCartItem: updateCartItemMutation.mutateAsync,
    isUpdatingCartItem: updateCartItemMutation.isPending,
    deleteCartItem: deleteCartItemMutation.mutateAsync,
    isDeletingCartItem: deleteCartItemMutation.isPending,
    clearCart: clearCartMutation.mutateAsync,
    isClearingCart: clearCartMutation.isPending,
  };
}
