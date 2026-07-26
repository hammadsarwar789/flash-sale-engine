import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/cart';
import { useAuth } from '../context/AuthContext';

export function useCart() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.getCart(),
    enabled: isAuthenticated,
    staleTime: 1000 * 30, // 30 seconds
  });

  const addToCartMutation = useMutation({
    mutationFn: (data: { product_id: string; variant_id?: string; quantity?: number }) =>
      cartApi.addToCart(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const updateCartItemMutation = useMutation({
    mutationFn: ({ item_id, quantity }: { item_id: string; quantity: number }) =>
      cartApi.updateCartItem(item_id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
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
