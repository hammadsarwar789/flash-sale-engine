import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/orders';
import { useAuth } from '../context/AuthContext';

export function useOrders() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.listUserOrders(),
    enabled: isAuthenticated,
  });

  const checkoutMutation = useMutation({
    mutationFn: (idempotencyKey: string) => ordersApi.checkout(idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const guestCheckoutMutation = useMutation({
    mutationFn: ({
      email,
      items,
      idempotencyKey,
    }: {
      email: string;
      items: Array<{ product_id: string; variant_id?: string; quantity: number }>;
      idempotencyKey: string;
    }) => ordersApi.guestCheckout(email, items, idempotencyKey),
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (order_id: string) => ordersApi.cancelOrder(order_id),
    onSuccess: (_, order_id) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', order_id] });
    },
  });

  return {
    orders: ordersQuery.data || [],
    isLoading: ordersQuery.isLoading,
    refetchOrders: ordersQuery.refetch,
    checkout: checkoutMutation.mutateAsync,
    isCheckingOut: checkoutMutation.isPending,
    guestCheckout: guestCheckoutMutation.mutateAsync,
    isGuestCheckingOut: guestCheckoutMutation.isPending,
    cancelOrder: cancelOrderMutation.mutateAsync,
    isCancellingOrder: cancelOrderMutation.isPending,
  };
}

export function useOrderDetail(orderId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.getOrder(orderId!),
    enabled: isAuthenticated && !!orderId,
  });
}
