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
import 'package:mobile_app/presentation/widgets/empty_state_widget.dart';
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
  bool _isPromoExpanded = false;

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
          AppToast.showSuccess(context, 'Promo applied: $code');
        }
      } else {
        if (mounted) {
          AppToast.showError(context, res.message.isNotEmpty ? res.message : 'Invalid promo code');
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

  void _removeCoupon() {
    setState(() {
      _appliedCoupon = null;
      _discountAmount = 0.0;
      _couponController.clear();
    });
    AppToast.showInfo(context, 'Promo code removed');
  }

  void _removeItemWithUndo(CartItemModel item) {
    context.read<CartBloc>().add(RemoveCartItemEvent(item.id));
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Item removed from cart.',
          style: GoogleFonts.manrope(
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
        action: SnackBarAction(
          label: 'UNDO',
          textColor: Theme.of(context).brightness == Brightness.dark ? C.darkAmber : C.lightAmber,
          onPressed: () {
            context.read<CartBloc>().add(
                  AddToCartEvent(
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity > 0 ? item.quantity : 1,
                    product: item.product,
                  ),
                );
          },
        ),
        duration: const Duration(seconds: 4),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _onProceedToCheckout(CartSummaryModel cart) {
    final items = cart.items;
    if (items.isEmpty) {
      AppToast.showInfo(context, 'Your cart is empty.');
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
      AppToast.showInfo(context, 'Please sign in to complete your purchase.');
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
          'Cart',
          style: GoogleFonts.sora(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: primaryTextColor,
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
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(C.radiusCard),
                            ),
                          ),
                          child: const Text('Try again'),
                        ),
                      ],
                    ),
                  ),
                );
              }

              if (state is CartLoaded) {
                if (state.cart.items.isEmpty) {
                  return EmptyStateWidget.cartEmpty(
                    onBrowseDeals: () => context.go('/home'),
                  );
                }
                return _buildCartContentView(state.cart);
              }

              return Center(child: CircularProgressIndicator(color: amberColor));
            },
          ),
        ),
      ),
    );
  }

  Widget _buildCartContentView(CartSummaryModel cart) {
    final items = cart.items;
    final subtotal = cart.subtotal;
    final total = (subtotal - _discountAmount).clamp(0.0, double.infinity);
    final holdEnd = cart.expiresAt ?? DateTime.now().add(const Duration(minutes: 10));

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final secondaryTextColor = isDark ? C.darkTextDim : const Color(0xFF4B5563);
    final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);
    final amberColor = isDark ? C.darkAmber : C.lightAmber;
    final roseColor = isDark ? C.darkRose : C.lightRose;
    final cardBg = isDark ? C.darkSurface : Colors.white;
    final cardBorder = isDark ? C.darkLine : const Color(0xFFE5E7EB);
    final stepperBg = isDark ? C.darkRaised : const Color(0xFFF3F4F6);

    return Column(
      children: [
        // Slim Inline Reservation Hold Notice
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
          child: CountdownTimerWidget(
            targetEndTime: holdEnd,
            onFinished: () {
              context.read<CartBloc>().add(CartReservationExpiredEvent());
            },
          ),
        ),

        // Scrollable Cart Items & Summary
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
                                    color: Colors.black.withValues(alpha: 0.03),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ],
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Product Thumbnail (64x64)
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                width: 64,
                                height: 64,
                                color: stepperBg,
                                child: Builder(
                                  builder: (_) {
                                    final itemImg = item.imageUrl;
                                    final prodImg = item.product?.imageUrl;
                                    final img = (itemImg != null && itemImg.isNotEmpty)
                                        ? itemImg
                                        : ((prodImg != null && prodImg.isNotEmpty) ? prodImg : null);

                                    if (img != null && img.isNotEmpty) {
                                      return Image.network(
                                        img,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, _, _) => Icon(
                                          Icons.shopping_bag_outlined,
                                          color: muteTextColor,
                                          size: 24,
                                        ),
                                      );
                                    }
                                    return Icon(
                                      Icons.shopping_bag_outlined,
                                      color: muteTextColor,
                                      size: 24,
                                    );
                                  },
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),

                            // Info: Title, Variant, Low Stock, Price, and Remove button
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.productName.isNotEmpty ? item.productName : (item.product?.name ?? 'Flash Item'),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.manrope(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: primaryTextColor,
                                    ),
                                  ),
                                  if (item.variantName != null && item.variantName!.isNotEmpty) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      item.variantName!,
                                      style: GoogleFonts.manrope(
                                        fontSize: 11,
                                        color: muteTextColor,
                                      ),
                                    ),
                                  ],
                                  if (item.isLowStock) ...[
                                    const SizedBox(height: 3),
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.bolt, size: 11, color: amberColor),
                                        const SizedBox(width: 2),
                                        Text(
                                          'Only ${item.availableStock} left',
                                          style: GoogleFonts.manrope(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w600,
                                            color: amberColor,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                  const SizedBox(height: 4),
                                  PriceText(amount: item.unitPrice, size: PriceTextSize.sm, color: primaryTextColor),
                                  const SizedBox(height: 6),
                                  // Subtle Remove button
                                  InkWell(
                                    onTap: () => _removeItemWithUndo(item),
                                    borderRadius: BorderRadius.circular(4),
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 2),
                                      child: Text(
                                        'Remove',
                                        style: GoogleFonts.manrope(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w500,
                                          color: roseColor,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Quantity Stepper on the right
                            Container(
                              height: 32,
                              decoration: BoxDecoration(
                                color: stepperBg,
                                borderRadius: BorderRadius.circular(C.radiusCard),
                                border: Border.all(color: cardBorder),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: Icon(
                                      item.quantity <= 1 ? Icons.delete_outline_rounded : Icons.remove,
                                      size: 14,
                                      color: item.quantity <= 1 ? roseColor : secondaryTextColor,
                                    ),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                    onPressed: () {
                                      if (item.quantity <= 1) {
                                        _removeItemWithUndo(item);
                                      } else {
                                        context.read<CartBloc>().add(
                                              UpdateCartItemQuantityEvent(
                                                itemId: item.id,
                                                quantity: item.quantity - 1,
                                              ),
                                            );
                                      }
                                    },
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 4),
                                    child: Text(
                                      '${item.quantity}',
                                      style: GoogleFonts.jetBrainsMono(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: primaryTextColor,
                                        fontFeatures: const [FontFeature.tabularFigures()],
                                      ),
                                    ),
                                  ),
                                  IconButton(
                                    icon: Icon(Icons.add, size: 14, color: secondaryTextColor),
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                    onPressed: () {
                                      final maxStock = item.availableStock;
                                      if (item.quantity >= maxStock) {
                                        AppToast.showInfo(
                                          context,
                                          'Maximum available quantity reached ($maxStock in stock)',
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
                          ],
                        ),
                      );
                    },
                    childCount: items.length,
                  ),
                ),
              ),

              // Expandable Promo Code Accordion
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: Container(
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(C.radiusCard),
                      border: Border.all(color: cardBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        InkWell(
                          onTap: () {
                            setState(() {
                              _isPromoExpanded = !_isPromoExpanded;
                            });
                          },
                          borderRadius: BorderRadius.circular(C.radiusCard),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            child: Row(
                              children: [
                                Icon(Icons.discount_outlined, size: 17, color: amberColor),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: _appliedCoupon != null
                                      ? Text(
                                          'Promo code applied: $_appliedCoupon',
                                          style: GoogleFonts.manrope(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: isDark ? C.darkMint : C.lightMint,
                                          ),
                                        )
                                      : Text(
                                          'Have a promo code?',
                                          style: GoogleFonts.manrope(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            color: primaryTextColor,
                                          ),
                                        ),
                                ),
                                if (_appliedCoupon != null)
                                  GestureDetector(
                                    onTap: _removeCoupon,
                                    child: Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 6),
                                      child: Text(
                                        'Remove',
                                        style: GoogleFonts.manrope(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w500,
                                          color: roseColor,
                                        ),
                                      ),
                                    ),
                                  ),
                                Icon(
                                  _isPromoExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                  size: 18,
                                  color: muteTextColor,
                                ),
                              ],
                            ),
                          ),
                        ),
                        if (_isPromoExpanded) ...[
                          const Divider(height: 1, color: Color(0x1A888888)),
                          Padding(
                            padding: const EdgeInsets.all(12),
                            child: Row(
                              children: [
                                Expanded(
                                  child: SizedBox(
                                    height: C.heightInput,
                                    child: TextField(
                                      controller: _couponController,
                                      style: GoogleFonts.manrope(fontSize: 12, color: primaryTextColor),
                                      decoration: InputDecoration(
                                        hintText: 'Enter code (e.g. FLASH10)',
                                        hintStyle: GoogleFonts.manrope(fontSize: 12, color: muteTextColor),
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                        filled: true,
                                        fillColor: stepperBg,
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(C.radiusCard),
                                          borderSide: BorderSide(color: cardBorder),
                                        ),
                                        enabledBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(C.radiusCard),
                                          borderSide: BorderSide(color: cardBorder),
                                        ),
                                        focusedBorder: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(C.radiusCard),
                                          borderSide: BorderSide(color: amberColor),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                SizedBox(
                                  height: C.heightInput,
                                  child: ElevatedButton(
                                    onPressed: _isValidatingCoupon ? null : () => _applyCoupon(subtotal),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: amberColor,
                                      foregroundColor: isDark ? C.darkOnAmber : Colors.white,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(C.radiusCard),
                                      ),
                                      padding: const EdgeInsets.symmetric(horizontal: 16),
                                    ),
                                    child: _isValidatingCoupon
                                        ? const SizedBox(
                                            height: 14,
                                            width: 14,
                                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                          )
                                        : Text(
                                            'Apply',
                                            style: GoogleFonts.manrope(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),

              // Order Summary Card
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(C.radiusCard),
                      border: Border.all(color: cardBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Order Summary',
                          style: GoogleFonts.sora(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: primaryTextColor,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Subtotal',
                              style: GoogleFonts.manrope(fontSize: 12, color: secondaryTextColor),
                            ),
                            PriceText(amount: subtotal, size: PriceTextSize.sm, color: primaryTextColor),
                          ],
                        ),
                        if (_discountAmount > 0) ...[
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Discount',
                                style: GoogleFonts.manrope(
                                  fontSize: 12,
                                  color: isDark ? C.darkMint : C.lightMint,
                                ),
                              ),
                              PriceText(
                                amount: _discountAmount,
                                size: PriceTextSize.sm,
                                color: isDark ? C.darkMint : C.lightMint,
                              ),
                            ],
                          ),
                        ],
                        const SizedBox(height: 10),
                        Divider(color: cardBorder, height: 1),
                        const SizedBox(height: 10),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Total',
                              style: GoogleFonts.sora(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: primaryTextColor,
                              ),
                            ),
                            PriceText(amount: total, size: PriceTextSize.lg, color: primaryTextColor),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 20)),
            ],
          ),
        ),

        // Pinned Bottom Checkout CTA
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          decoration: BoxDecoration(
            color: cardBg,
            border: Border(top: BorderSide(color: cardBorder)),
            boxShadow: isDark
                ? null
                : [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 6,
                      offset: const Offset(0, -2),
                    ),
                  ],
          ),
          child: SizedBox(
            height: C.heightButtonPrimary,
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => _onProceedToCheckout(cart),
              style: ElevatedButton.styleFrom(
                backgroundColor: amberColor,
                foregroundColor: isDark ? C.darkOnAmber : Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(C.radiusCard),
                ),
                elevation: 0,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Checkout · ',
                    style: GoogleFonts.manrope(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.2,
                    ),
                  ),
                  Text(
                    '\$${total.toStringAsFixed(2)}',
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
