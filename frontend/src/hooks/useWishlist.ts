import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commerceApi } from '../api/commerce';
import { useAuth } from '../context/AuthContext';

export function useWishlist() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const wishlistQuery = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => commerceApi.getWishlist(),
    enabled: isAuthenticated,
  });

  const addToWishlistMutation = useMutation({
    mutationFn: (product_id: string) => commerceApi.addToWishlist(product_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: (item_id: string) => commerceApi.removeFromWishlist(item_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  return {
    wishlistItems: wishlistQuery.data || [],
    isLoading: wishlistQuery.isLoading,
    addToWishlist: addToWishlistMutation.mutateAsync,
    isAdding: addToWishlistMutation.isPending,
    removeFromWishlist: removeFromWishlistMutation.mutateAsync,
    isRemoving: removeFromWishlistMutation.isPending,
  };
}
