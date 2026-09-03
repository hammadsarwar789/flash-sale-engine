import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/theme_controller.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/cart_model.dart';
import 'package:mobile_app/data/models/order_model.dart';
import 'package:mobile_app/data/repositories/cart_repository.dart';
import 'package:mobile_app/logic/auth/auth_bloc.dart';
import 'package:mobile_app/logic/auth/auth_state.dart';
import 'package:mobile_app/logic/cart/cart_bloc.dart';
import 'package:mobile_app/logic/cart/cart_event.dart';
import 'package:mobile_app/logic/cart/cart_state.dart';
import 'package:mobile_app/presentation/widgets/app_toast.dart';
import 'package:mobile_app/presentation/widgets/countdown_timer_widget.dart';
import 'package:mobile_app/presentation/widgets/price_text.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> with WidgetsBindingObserver {
  final TextEditingController _couponController = TextEditingController();
  String? _appliedCoupon;
  double _discountAmount = 0.0;
  bool _isValidatingCoupon = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    context.read<CartBloc>().add(LoadCartEvent());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      context.read<CartBloc>().add(SyncCartReservationEvent());
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
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
          AppToast.showSuccess(context, 'PROMO APPLIED: $code');
        }
      } else {
        if (mounted) {
          AppToast.showError(context, res.message.isNotEmpty ? res.message : 'Invalid coupon code');
        }
      }
    } catch (e) {
      if (mounted) {
        AppToast.showError(context, 'Failed to validate promo code: $e');
      }
    } finally {
      if (mounted) setState(() => _isValidatingCoupon = false);
    }
  }

  void _onProceedToCheckout(CartSummaryModel cart) {
    final items = cart.items;
    if (items.isEmpty) {
      AppToast.showInfo(context, 'Your hold vault is empty.');
      return;
    }

    final authState = context.read<AuthBloc>().state;
    final order = OrderModel(
      id: 0,
      userId: (authState is Authenticated && authState.user != null) ? authState.user!.id : 0,
      totalAmount: cart.subtotal,
      status: 'pending',
      items: items
          .map((i) => OrderItemModel(
                id: i.id != null ? int.tryParse(i.id.toString()) : null,
                productId: int.tryParse(i.productId?.toString() ?? '0') ?? 0,
                productName: i.productName.isNotEmpty ? i.productName : (i.product?.name ?? 'Flash Item'),
                unitPrice: i.unitPrice,
                quantity: i.quantity,
                subtotal: i.subtotal,
              ))
          .toList(),
      createdAt: DateTime.now().toIso8601String(),
    );

    final checkoutData = {
      'order': order,
      'couponCode': _appliedCoupon,
      'discount': _discountAmount,
    };

    if (authState is! Authenticated) {
      AppToast.showInfo(context, 'Authentication required to complete settlement.');
      context.push(
        '/login',
        extra: {
          'returnTo': '/settlement',
          'redirectTo': '/settlement',
          'checkoutData': checkoutData,
        },
      );
      return;
    }

    context.push(
      '/settlement',
      extra: checkoutData,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final amberColor = isDark ? C.darkAmber : C.lightAmber;
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final secondaryTextColor = isDark ? C.darkTextDim : const Color(0xFF4B5563);
    final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
        title: Text(
          'HOLD VAULT',
          style: GoogleFonts.sora(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: primaryTextColor,
            letterSpacing: 0.5,
          ),
        ),
        actions: [
          AnimatedBuilder(
            animation: ThemeController.instance,
            builder: (context, _) {
              final isCurrentDark = ThemeController.instance.isDark;
              return IconButton(
                icon: Icon(
                  isCurrentDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                  color: isCurrentDark ? amberColor : secondaryTextColor,
                  size: 22,
                ),
                tooltip: isCurrentDark ? 'Switch to Day Mode' : 'Switch to Night Mode',
                onPressed: () {
                  HapticFeedback.lightImpact();
                  ThemeController.instance.toggleTheme();
                },
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: BlocListener<CartBloc, CartState>(
          listener: (context, state) {
            if (state is ReservationExpiredState) {
              AppToast.showError(context, state.message);
            }
          },
          child: BlocBuilder<CartBloc, CartState>(
            builder: (context, state) {
              if (state is CartLoading || state is CartInitial) {
                return Center(child: CircularProgressIndicator(color: amberColor));
              }

              if (state is CartError) {
                final roseColor = isDark ? C.darkRose : C.lightRose;
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.error_outline, size: 44, color: roseColor),
                        const SizedBox(height: 12),
                        Text(
                          state.message,
                          textAlign: TextAlign.center,
                          style: GoogleFonts.manrope(color: muteTextColor),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => context.read<CartBloc>().add(LoadCartEvent()),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: amberColor,
                            foregroundColor: isDark ? C.darkOnAmber : Colors.white,
                          ),
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
              return Center(child: CircularProgressIndicator(color: amberColor));
            },
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyCartView() {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final amberColor = isDark ? C.darkAmber : C.lightAmber;
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);

    return ScrollConfiguration(
      behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
      child: Center(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: isDark ? C.darkRaised : const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(C.radiusCard),
                    border: Border.all(color: isDark ? C.darkLine : const Color(0xFFE5E7EB)),
                  ),
                  child: Icon(Icons.shopping_bag_outlined, size: 36, color: amberColor),
                ),
                const SizedBox(height: 16),
                Text(
                  'Your Hold Vault is Empty',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.sora(fontSize: 20, fontWeight: FontWeight.bold, color: primaryTextColor),
                ),
                const SizedBox(height: 6),
                Text(
                  'Reserve stock from flash drops before timer expires.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.manrope(fontSize: 12, color: muteTextColor),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: () => context.go('/home'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: amberColor,
                    foregroundColor: isDark ? C.darkOnAmber : Colors.white,
                  ),
                  child: const Text('RETURN TO THE FLOOR'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCartContentView(CartSummaryModel cart) {
    final items = cart.items;
    if (items.isEmpty) {
      return _buildEmptyCartView();
    }
    final subtotal = cart.subtotal;
    final total = (subtotal - _discountAmount).clamp(0.0, double.infinity);
    final holdEnd = cart.expiresAt ?? DateTime.now().add(const Duration(minutes: 10));

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final secondaryTextColor = isDark ? C.darkTextDim : const Color(0xFF4B5563);
    final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);
    final amberColor = isDark ? C.darkAmber : C.lightAmber;
    final cardBg = isDark ? C.darkSurface : Colors.white;
    final cardBorder = isDark ? C.darkLine : const Color(0xFFE5E7EB);
    final stepperBg = isDark ? C.darkRaised : const Color(0xFFF3F4F6);

    return Column(
      children: [
        // Pinned Server-Authoritative Hold Countdown Strip
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
          child: CountdownTimerWidget(
            targetEndTime: holdEnd,
            label: 'RESERVATION HOLD',
            onFinished: () {
              context.read<CartBloc>().add(CartReservationExpiredEvent());
            },
          ),
        ),

        // Scrollable Cart Content
        Expanded(
          child: CustomScrollView(
            physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
            slivers: [
              // Cart Line Items
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final item = items[index];
                      return Container(
                        key: ValueKey('cart_item_${item.id ?? index}'),
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: cardBg,
                          borderRadius: BorderRadius.circular(C.radiusCard),
                          border: Border.all(color: cardBorder),
                          boxShadow: isDark
                              ? null
                              : [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.04),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
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
                                    color: stepperBg,
                                    child: (img != null && img.isNotEmpty)
                                        ? Image.network(
                                            img,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, _, _) => Icon(Icons.shopping_bag_outlined, color: muteTextColor, size: 24),
                                          )
                                        : Icon(Icons.shopping_bag_outlined, color: muteTextColor, size: 24),
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
                                    style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: primaryTextColor),
                                  ),
                                  if (item.variantName != null && (item.variantName?.isNotEmpty ?? false)) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      item.variantName ?? '',
                                      style: GoogleFonts.jetBrainsMono(fontSize: 10, color: muteTextColor),
                                    ),
                                  ],
                                  if (item.isLowStock) ...[
                                    const SizedBox(height: 2),
                                    Row(
                                      children: [
                                        Icon(Icons.bolt, size: 10, color: amberColor),
                                        const SizedBox(width: 2),
                                        Text(
                                          'Only ${item.availableStock} left in pool',
                                          style: GoogleFonts.jetBrainsMono(
                                            fontSize: 9,
                                            fontWeight: FontWeight.bold,
                                            color: amberColor,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                  const SizedBox(height: 4),
                                  PriceText(amount: item.unitPrice, size: PriceTextSize.sm, color: primaryTextColor),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Container(
                                        height: 28,
                                        decoration: BoxDecoration(
                                          color: stepperBg,
                                          borderRadius: BorderRadius.circular(C.radiusCard),
                                          border: Border.all(color: cardBorder),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            IconButton(
                                              icon: Icon(Icons.remove, size: 14, color: secondaryTextColor),
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
                                                color: primaryTextColor,
                                                fontFeatures: [const FontFeature.tabularFigures()],
                                              ),
                                            ),
                                            IconButton(
                                              icon: Icon(Icons.add, size: 14, color: secondaryTextColor),
                                              padding: EdgeInsets.zero,
                                              constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                              onPressed: () {
                                                final maxStock = item.availableStock;
                                                if (item.quantity >= maxStock) {
                                                  AppToast.showInfo(
                                                    context,
                                                    'Maximum available stock reached ($maxStock available)',
                                                  );
                                                  return;
                                                }
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
                                        icon: Icon(Icons.delete_outline, size: 18, color: isDark ? C.darkRose : C.lightRose),
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
                    childCount: items.length,
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
    ),
  ),
],
);
  }
}
