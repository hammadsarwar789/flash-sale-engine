import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/cart_model.dart';
import 'package:mobile_app/data/models/order_model.dart';
import 'package:mobile_app/data/repositories/cart_repository.dart';
import 'package:mobile_app/logic/auth/auth_bloc.dart';
import 'package:mobile_app/logic/auth/auth_state.dart';
import 'package:mobile_app/logic/cart/cart_bloc.dart';
import 'package:mobile_app/logic/cart/cart_event.dart';
import 'package:mobile_app/logic/cart/cart_state.dart';
import 'package:mobile_app/presentation/widgets/countdown_timer_widget.dart';
import 'package:mobile_app/presentation/widgets/price_text.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final TextEditingController _couponController = TextEditingController();
  String? _appliedCoupon;
  double _discountAmount = 0.0;
  bool _isValidatingCoupon = false;

  @override
  void initState() {
    super.initState();
    context.read<CartBloc>().add(LoadCartEvent());
  }

  @override
  void dispose() {
    _couponController.dispose();
    super.dispose();
  }

  Future<void> _applyCoupon(double currentSubtotal) async {
    final code = _couponController.text.trim();
    if (code.isEmpty) return;

    setState(() => _isValidatingCoupon = true);
    try {
      final repo = context.read<CartRepository>();
      final res = await repo.validateCoupon(code, currentSubtotal);
      if (res.valid) {
        setState(() {
          _appliedCoupon = code;
          _discountAmount = res.calculatedDiscount > 0 ? res.calculatedDiscount : res.discountValue;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('PROMO APPLIED: $code', style: GoogleFonts.jetBrainsMono(color: C.mint)),
              backgroundColor: C.raised,
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(res.message.isNotEmpty ? res.message : 'Invalid coupon code'), backgroundColor: C.rose),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to validate promo code: $e'), backgroundColor: C.rose),
        );
      }
    } finally {
      if (mounted) setState(() => _isValidatingCoupon = false);
    }
  }

  void _onProceedToCheckout(CartSummaryModel cart) {
    final order = OrderModel(
      id: 0,
      userId: 1,
      totalAmount: cart.subtotal,
      status: 'pending',
      items: cart.items
          .map((i) => OrderItemModel(
                id: i.id,
                productId: i.productId,
                productName: i.productName.isNotEmpty ? i.productName : (i.product?.name ?? 'Flash Item'),
                unitPrice: i.unitPrice,
                quantity: i.quantity,
                subtotal: i.subtotal,
              ))
          .toList(),
      createdAt: DateTime.now().toIso8601String(),
    );

    context.push(
      '/checkout',
      extra: {
        'order': order,
        'couponCode': _appliedCoupon,
        'discount': _discountAmount,
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: C.base,
      appBar: AppBar(
        backgroundColor: C.surface,
        elevation: 0,
        title: Text(
          'Hold Vault / Cart',
          style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: C.text),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: C.text),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: BlocBuilder<AuthBloc, AuthState>(
          builder: (context, authState) {
            if (authState is AuthLoading) {
              return const Center(child: CircularProgressIndicator(color: C.amber));
            }

            if (authState is! Authenticated) {
              return _buildUnauthenticatedView();
            }

            return BlocBuilder<CartBloc, CartState>(
              builder: (context, state) {
                if (state is CartLoading || state is CartInitial) {
                  return const Center(child: CircularProgressIndicator(color: C.amber));
                }

                if (state is CartError) {
                  final isAuthError = state.message.toLowerCase().contains('expired') ||
                      state.message.toLowerCase().contains('session') ||
                      state.message.toLowerCase().contains('token') ||
                      state.message.toLowerCase().contains('unauthorized') ||
                      state.message.toLowerCase().contains('401') ||
                      state.message.toLowerCase().contains('sign in') ||
                      state.message.toLowerCase().contains('log in');

                  if (isAuthError) {
                    return _buildUnauthenticatedView();
                  }

                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline, size: 44, color: C.rose),
                          const SizedBox(height: 12),
                          Text(
                            state.message,
                            textAlign: TextAlign.center,
                            style: GoogleFonts.manrope(color: C.textMute),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: () => context.read<CartBloc>().add(LoadCartEvent()),
                            child: const Text('RETRY'),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                if (state is CartLoaded) {
                  if (state.cart.items.isEmpty) {
                    return _buildEmptyCartView();
                  }
                  return _buildCartContentView(state.cart);
                }

                // Default fallback
                return const Center(child: CircularProgressIndicator(color: C.amber));
              },
            );
          },
        ),
      ),
    );
  }

  Widget _buildUnauthenticatedView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: C.raised,
                borderRadius: BorderRadius.circular(C.radiusCard),
                border: Border.all(color: C.amber.withValues(alpha: 0.3)),
              ),
              child: const Icon(Icons.lock_clock_outlined, size: 32, color: C.amber),
            ),
            const SizedBox(height: 16),
            Text(
              'Session Authentication Required',
              style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.bold, color: C.text),
            ),
            const SizedBox(height: 6),
            Text(
              'Please sign in to access your Hold Vault, reserved items, and checkout.',
              textAlign: TextAlign.center,
              style: GoogleFonts.manrope(fontSize: 12, color: C.textMute),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton(
                  onPressed: () => context.go('/home'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: C.raised,
                    foregroundColor: C.text,
                  ),
                  child: const Text('EXPLORE FLOOR'),
                ),
                const SizedBox(width: 10),
                ElevatedButton(
                  onPressed: () => context.push('/login'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: C.amber,
                    foregroundColor: C.onAmber,
                  ),
                  child: const Text('SIGN IN'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyCartView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.shopping_bag_outlined, size: 48, color: C.textMute),
            const SizedBox(height: 12),
            Text(
              'YOUR HOLD VAULT IS EMPTY',
              style: GoogleFonts.jetBrainsMono(fontSize: 13, fontWeight: FontWeight.bold, color: C.textDim),
            ),
            const SizedBox(height: 4),
            Text(
              'Reserve stock from flash drops before timer expires.',
              style: GoogleFonts.manrope(fontSize: 12, color: C.textMute),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => context.go('/home'),
              child: const Text('RETURN TO THE FLOOR'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCartContentView(CartSummaryModel cart) {
    final subtotal = cart.subtotal;
    final total = (subtotal - _discountAmount).clamp(0.0, double.infinity);

    return CustomScrollView(
      slivers: [
        // 10:00 Hold Countdown Strip
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: CountdownTimerWidget(
              targetEndTime: DateTime.now().add(const Duration(minutes: 10)),
              label: 'RESERVATION HOLD',
              onFinished: () {
                context.read<CartBloc>().add(LoadCartEvent());
              },
            ),
          ),
        ),

        // Cart Line Items
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          sliver: SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final item = cart.items[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: C.surface,
                    borderRadius: BorderRadius.circular(C.radiusCard),
                    border: Border.all(color: C.line),
                  ),
                  child: Row(
                    children: [
                      // Product Thumbnail
                      Builder(
                        builder: (_) {
                          final itemImg = item.imageUrl;
                          final prodImg = item.product?.imageUrl;
                          final img = (itemImg != null && itemImg.isNotEmpty)
                              ? itemImg
                              : ((prodImg != null && prodImg.isNotEmpty) ? prodImg : null);

                          return ClipRRect(
                            borderRadius: BorderRadius.circular(C.radiusCard),
                            child: Container(
                              width: 64,
                              height: 64,
                              color: C.raised,
                              child: (img != null && img.isNotEmpty)
                                  ? Image.network(
                                      img,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => const Icon(Icons.shopping_bag_outlined, color: C.textMute, size: 24),
                                    )
                                  : const Icon(Icons.shopping_bag_outlined, color: C.textMute, size: 24),
                            ),
                          );
                        },
                      ),
                      const SizedBox(width: 12),

                      // Info & Stepper
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.productName.isNotEmpty ? item.productName : (item.product?.name ?? 'Flash Item'),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.manrope(fontSize: 13, fontWeight: FontWeight.w600, color: C.text),
                            ),
                            if (item.variantName != null && (item.variantName?.isNotEmpty ?? false)) ...[
                              const SizedBox(height: 2),
                              Text(
                                item.variantName ?? '',
                                style: GoogleFonts.jetBrainsMono(fontSize: 10, color: C.textMute),
                              ),
                            ],
                            const SizedBox(height: 4),
                            PriceText(amount: item.unitPrice, size: PriceTextSize.sm),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Container(
                                  height: 28,
                                  decoration: BoxDecoration(
                                    color: C.raised,
                                    borderRadius: BorderRadius.circular(C.radiusCard),
                                    border: Border.all(color: C.line),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.remove, size: 14, color: C.textDim),
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                        onPressed: () {
                                          context.read<CartBloc>().add(
                                                UpdateCartItemQuantityEvent(
                                                  itemId: item.id,
                                                  quantity: item.quantity - 1,
                                                ),
                                              );
                                        },
                                      ),
                                      Text(
                                        '${item.quantity}',
                                        style: GoogleFonts.jetBrainsMono(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: C.text,
                                          fontFeatures: [const FontFeature.tabularFigures()],
                                        ),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.add, size: 14, color: C.textDim),
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                        onPressed: () {
                                          context.read<CartBloc>().add(
                                                UpdateCartItemQuantityEvent(
                                                  itemId: item.id,
                                                  quantity: item.quantity + 1,
                                                ),
                                              );
                                        },
                                      ),
                                    ],
                                  ),
                                ),
                                const Spacer(),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, size: 18, color: C.rose),
                                  onPressed: () => context.read<CartBloc>().add(RemoveCartItemEvent(item.id)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
              childCount: cart.items.length,
            ),
          ),
        ),

        // Coupon Code Entry
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: C.surface,
                borderRadius: BorderRadius.circular(C.radiusCard),
                border: Border.all(color: C.line),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _couponController,
                      style: GoogleFonts.jetBrainsMono(fontSize: 12, color: C.text),
                      decoration: const InputDecoration(
                        hintText: 'PROMO CODE (e.g. FLASH10)',
                        prefixIcon: Icon(Icons.discount_outlined, size: 18, color: C.textMute),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _isValidatingCoupon ? null : () => _applyCoupon(subtotal),
                    child: _isValidatingCoupon
                        ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: C.onAmber))
                        : const Text('APPLY'),
                  ),
                ],
              ),
            ),
          ),
        ),

        // Order Summary Card
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: C.surface,
                borderRadius: BorderRadius.circular(C.radiusCard),
                border: Border.all(color: C.line),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('SETTLEMENT SUMMARY', style: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.bold, color: C.textMute)),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('SUBTOTAL', style: GoogleFonts.jetBrainsMono(fontSize: 11, color: C.textDim)),
                      PriceText(amount: subtotal, size: PriceTextSize.sm),
                    ],
                  ),
                  if (_discountAmount > 0) ...[
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('PROMO DISCOUNT', style: GoogleFonts.jetBrainsMono(fontSize: 11, color: C.mint)),
                        PriceText(amount: _discountAmount, size: PriceTextSize.sm, color: C.mint),
                      ],
                    ),
                  ],
                  const Divider(color: C.line, height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('TOTAL SETTLED', style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.bold, color: C.text)),
                      PriceText(amount: total, size: PriceTextSize.lg, color: C.text),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),

        // Checkout Button
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
            child: SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: () => _onProceedToCheckout(cart),
                style: ElevatedButton.styleFrom(backgroundColor: C.amber, foregroundColor: C.onAmber),
                child: Text(
                  'PROCEED TO SETTLEMENT →',
                  style: GoogleFonts.manrope(fontSize: 13, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
