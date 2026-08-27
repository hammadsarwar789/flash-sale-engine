import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_app/core/theme/app_theme.dart';
import 'package:mobile_app/core/utils/formatters.dart';
import 'package:mobile_app/data/models/cart_model.dart';
import 'package:mobile_app/logic/cart/cart_bloc.dart';
import 'package:mobile_app/logic/cart/cart_event.dart';
import 'package:mobile_app/logic/cart/cart_state.dart';
import 'package:mobile_app/logic/orders/order_bloc.dart';
import 'package:mobile_app/logic/orders/order_event.dart';
import 'package:mobile_app/logic/orders/order_state.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  @override
  void initState() {
    super.initState();
    context.read<CartBloc>().add(LoadCartEvent());
  }

  void _onCheckout(CartSummaryModel cart) {
    if (cart.items.isEmpty) return;
    final firstItem = cart.items.first;
    context.read<OrderBloc>().add(
          ReserveFlashSaleEvent(
            productId: firstItem.productId,
            quantity: firstItem.quantity,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<OrderBloc, OrderState>(
      listener: (context, state) {
        if (state is ReservationSuccess) {
          context.push('/checkout', extra: state.response.order);
        } else if (state is OrderError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.accentFlash,
            ),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Shopping Cart'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(),
          ),
        ),
        body: BlocBuilder<CartBloc, CartState>(
          builder: (context, state) {
            if (state is CartLoading) {
              return const Center(
                child: CircularProgressIndicator(color: AppColors.accentFlash),
              );
            } else if (state is CartError) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: AppColors.accentFlash),
                      const SizedBox(height: 12),
                      Text(state.message, textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => context.read<CartBloc>().add(LoadCartEvent()),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              );
            } else if (state is CartLoaded) {
              final cart = state.cart;
              if (cart.items.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.shopping_cart_outlined, size: 64, color: AppColors.textMuted),
                      const SizedBox(height: 16),
                      const Text(
                        'Your cart is empty',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.ink),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Explore live flash deals and add items to your cart.',
                        style: TextStyle(color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: () => context.go('/home'),
                        child: const Text('Browse Deals'),
                      ),
                    ],
                  ),
                );
              }

              return Column(
                children: [
                  Expanded(
                    child: ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: cart.items.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final item = cart.items[index];
                        return _buildCartItemTile(context, item);
                      },
                    ),
                  ),
                  _buildCartSummaryFooter(context, cart),
                ],
              );
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Widget _buildCartItemTile(BuildContext context, CartItemModel item) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Container(
              width: 70,
              height: 70,
              color: AppColors.surfaceElevated,
              child: item.imageUrl != null && item.imageUrl!.isNotEmpty
                  ? Image.network(
                      item.imageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) =>
                          const Icon(Icons.shopping_bag, color: AppColors.textMuted),
                    )
                  : const Icon(Icons.shopping_bag, color: AppColors.textMuted),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.ink,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  AppFormatters.formatCurrency(item.unitPrice),
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.secondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _buildQuantityBtn(
                      icon: Icons.remove,
                      onTap: () {
                        context.read<CartBloc>().add(
                              UpdateCartItemQuantityEvent(
                                itemId: item.id,
                                quantity: item.quantity - 1,
                              ),
                            );
                      },
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text(
                        '${item.quantity}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ),
                    _buildQuantityBtn(
                      icon: Icons.add,
                      onTap: () {
                        context.read<CartBloc>().add(
                              UpdateCartItemQuantityEvent(
                                itemId: item.id,
                                quantity: item.quantity + 1,
                              ),
                            );
                      },
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: AppColors.textMuted, size: 20),
                      onPressed: () {
                        context.read<CartBloc>().add(RemoveCartItemEvent(item.id));
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuantityBtn({required IconData icon, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: AppColors.surfaceElevated,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppColors.border),
        ),
        child: Icon(icon, size: 16, color: AppColors.ink),
      ),
    );
  }

  Widget _buildCartSummaryFooter(BuildContext context, CartSummaryModel cart) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: SafeArea(
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Subtotal', style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
                Text(
                  AppFormatters.formatCurrency(cart.subtotal),
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.ink),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Express Flash Delivery', style: TextStyle(color: AppColors.textSecondary, fontSize: 14)),
                Text('FREE', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold)),
              ],
            ),
            const Divider(height: 24, color: AppColors.border),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Total Amount',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.ink),
                ),
                Text(
                  AppFormatters.formatCurrency(cart.subtotal),
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.accentFlash,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            BlocBuilder<OrderBloc, OrderState>(
              builder: (context, state) {
                final isReserving = state is ReservationInProgress;
                return ElevatedButton(
                  onPressed: isReserving ? null : () => _onCheckout(cart),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accentFlash,
                  ),
                  child: isReserving
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(AppColors.signalInk),
                          ),
                        )
                      : const Text(
                          '⚡ Flash Checkout & Lock Stock',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
