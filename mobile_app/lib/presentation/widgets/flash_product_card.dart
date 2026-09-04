import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/logic/wishlist/wishlist_bloc.dart';
import 'package:mobile_app/logic/wishlist/wishlist_event.dart';
import 'package:mobile_app/logic/wishlist/wishlist_state.dart';
import 'package:mobile_app/presentation/widgets/app_toast.dart';
import 'package:mobile_app/presentation/widgets/price_text.dart';

class FlashProductCard extends StatelessWidget {
  final ProductModel product;
  final VoidCallback onTap;
  final VoidCallback onAddToCart;

  const FlashProductCard({
    super.key,
    required this.product,
    required this.onTap,
    required this.onAddToCart,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final hasDiscount = product.discountPercentage > 0 && product.salePrice != null;

    final cardBg = isDark ? C.darkSurface : Colors.white;
    final cardBorder = isDark ? C.darkLine : const Color(0xFFE5E7EB);
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);
    final amberColor = isDark ? C.darkAmber : C.lightAmber;
    final onAmberColor = isDark ? C.darkOnAmber : Colors.white;
    final roseColor = isDark ? C.darkRose : C.lightRose;

    final isLowStock = product.stock > 0 && product.stock <= 5;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(C.radiusCard),
          border: Border.all(
            color: product.isSoldOut
                ? cardBorder
                : (isLowStock ? amberColor.withValues(alpha: 0.35) : cardBorder),
            width: 1,
          ),
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
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image Well with Discount Badge & Wishlist Action
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // Product image with opacity-50 and pointer-events-none if sold out
                  Opacity(
                    opacity: product.isSoldOut ? 0.5 : 1.0,
                    child: IgnorePointer(
                      ignoring: product.isSoldOut,
                      child: Container(
                        color: isDark ? C.darkRaised : const Color(0xFFF9FAFB),
                        child: ((product.primaryImageUrl ?? product.imageUrl) != null &&
                                ((product.primaryImageUrl ?? product.imageUrl)?.isNotEmpty ?? false))
                            ? Image.network(
                                (product.primaryImageUrl ?? product.imageUrl)!,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) => _buildPlaceholder(isDark),
                              )
                            : _buildPlaceholder(isDark),
                      ),
                    ),
                  ),

                  // Discount Tag
                  if (hasDiscount && !product.isSoldOut)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
                        decoration: BoxDecoration(
                          color: amberColor,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '-${product.discountPercentage}%',
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: onAmberColor,
                          ),
                        ),
                      ),
                    ),

                  // Floating Wishlist Heart Action
                  Positioned(
                    top: 8,
                    right: 8,
                    child: BlocBuilder<WishlistBloc, WishlistState>(
                      builder: (context, state) {
                        bool isSaved = false;
                        if (state is WishlistLoaded) {
                          isSaved = state.items.any((i) => i.productId.toString() == product.id.toString());
                        }
                        return GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () {
                            HapticFeedback.lightImpact();
                            context.read<WishlistBloc>().add(ToggleWishlistEvent(product.id, product: product));
                            if (!isSaved) {
                              AppToast.showSuccess(context, 'Saved: ${product.name}');
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.all(5),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? const Color(0xCC0B0D0C)
                                  : Colors.white.withValues(alpha: 0.9),
                              shape: BoxShape.circle,
                              border: Border.all(color: cardBorder),
                            ),
                            child: Icon(
                              isSaved ? Icons.favorite : Icons.favorite_border,
                              size: 15,
                              color: isSaved ? amberColor : muteTextColor,
                            ),
                          ),
                        );
                      },
                    ),
                  ),

                  // Low Stock / Sold Out Overlay Chip
                  if (product.isSoldOut)
                    Positioned(
                      bottom: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xDD181414) : const Color(0xEEFEE2E2),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: roseColor.withValues(alpha: 0.4)),
                        ),
                        child: Text(
                          'Sold out',
                          style: GoogleFonts.manrope(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: roseColor,
                          ),
                        ),
                      ),
                    )
                  else if (isLowStock)
                    Positioned(
                      bottom: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xDD2A2113) : const Color(0xEEFEF3C7),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: amberColor.withValues(alpha: 0.4)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.bolt, size: 11, color: amberColor),
                            const SizedBox(width: 2),
                            Text(
                              'Only ${product.stock} left',
                              style: GoogleFonts.manrope(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: amberColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Info Section
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Single Category Kicker
                  Text(
                    product.category.toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(
                      color: muteTextColor,
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.3,
                    ),
                  ),
                  const SizedBox(height: 2),

                  // Title (Standard Sans-Serif, Sentence Case)
                  Text(
                    product.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: primaryTextColor,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Price & Compact 36px Action Button Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Expanded(
                        child: PriceText(
                          amount: product.currentPrice,
                          originalAmount: hasDiscount ? product.price : null,
                          size: PriceTextSize.sm,
                          color: primaryTextColor,
                        ),
                      ),
                      const SizedBox(width: 6),

                      // Compact 36px action button that does not displace product imagery
                      product.isSoldOut
                          ? Container(
                              height: 34,
                              padding: const EdgeInsets.symmetric(horizontal: 8),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: isDark ? C.darkRaised : const Color(0xFFF3F4F6),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: cardBorder),
                              ),
                              child: Text(
                                'Sold out',
                                style: GoogleFonts.manrope(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: muteTextColor,
                                ),
                              ),
                            )
                          : Material(
                              color: amberColor,
                              borderRadius: BorderRadius.circular(8),
                              child: InkWell(
                                onTap: () {
                                  HapticFeedback.lightImpact();
                                  onAddToCart();
                                },
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  height: 34,
                                  width: 34,
                                  alignment: Alignment.center,
                                  child: Icon(
                                    Icons.add_shopping_cart,
                                    size: 16,
                                    color: onAmberColor,
                                  ),
                                ),
                              ),
                            ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholder(bool isDark) {
    return Container(
      color: isDark ? C.darkRaised : const Color(0xFFF9FAFB),
      child: Center(
        child: Icon(
          Icons.shopping_bag_outlined,
          color: isDark ? C.darkTextMute : const Color(0xFF9CA3AF),
          size: 32,
        ),
      ),
    );
  }
}
