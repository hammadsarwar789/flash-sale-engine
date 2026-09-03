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
    final isLive = product.stock > 0 && product.stock <= 15;

    final cardBg = isDark ? C.darkSurface : Colors.white;
    final cardBorder = isDark ? C.darkLine : const Color(0xFFE5E7EB);
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final secondaryTextColor = isDark ? C.darkTextDim : const Color(0xFF4B5563);
    final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);
    final amberColor = isDark ? C.darkAmber : C.lightAmber;
    final onAmberColor = isDark ? C.darkOnAmber : Colors.white;

    final isLowStock = product.stock > 0 && product.stock <= 5;
    final roseColor = isDark ? C.darkRose : C.lightRose;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(C.radiusCard),
          border: Border.all(
            color: product.isSoldOut
                ? cardBorder
                : (isLive ? amberColor.withValues(alpha: 0.5) : cardBorder),
            width: 1,
          ),
          boxShadow: isDark
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Header Row (Status / Category + LIVE)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: cardBorder.withValues(alpha: 0.6))),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: product.isSoldOut
                        ? Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 5,
                                height: 5,
                                decoration: BoxDecoration(color: roseColor, shape: BoxShape.circle),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'SOLD OUT',
                                style: GoogleFonts.jetBrainsMono(
                                  fontSize: 9,
                                  color: roseColor,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          )
                        : (isLowStock
                            ? Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 5,
                                    height: 5,
                                    decoration: BoxDecoration(color: amberColor, shape: BoxShape.circle),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    'ONLY ${product.stock} LEFT',
                                    style: GoogleFonts.jetBrainsMono(
                                      fontSize: 9,
                                      color: amberColor,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ],
                              )
                            : Text(
                                (product.categoryName ?? 'FLASH SALE').toUpperCase(),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.jetBrainsMono(
                                  fontSize: 9,
                                  color: muteTextColor,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.4,
                                ),
                              )),
                  ),
                  if (isLive && !product.isSoldOut)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 5,
                          height: 5,
                          decoration: BoxDecoration(
                            color: amberColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'LIVE',
                          style: GoogleFonts.jetBrainsMono(
                            color: amberColor,
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ),

            // Image Well with Badges & Heart Action
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    color: isDark ? C.darkRaised : const Color(0xFFF9FAFB),
                    child: (product.imageUrl != null && (product.imageUrl?.isNotEmpty ?? false))
                        ? Image.network(
                            product.imageUrl!,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => _buildPlaceholder(isDark),
                          )
                        : _buildPlaceholder(isDark),
                  ),
                  // Discount Tag
                  if (hasDiscount)
                    Positioned(
                      top: 6,
                      left: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: amberColor,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '-${product.discountPercentage}%',
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: onAmberColor,
                          ),
                        ),
                      ),
                    ),
                  // Floating Wishlist Heart Action
                  Positioned(
                    top: 6,
                    right: 6,
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
                              AppToast.showSuccess(context, 'SAVED: ${product.name}');
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
                              color: isSaved ? amberColor : secondaryTextColor,
                            ),
                          ),
                        );
                      },
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
                  // Category Tag
                  Text(
                    (product.categoryName ?? 'CATALOG').toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.jetBrainsMono(
                      color: muteTextColor,
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.4,
                    ),
                  ),
                  const SizedBox(height: 2),
                  // Title
                  Text(
                    product.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.sora(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: primaryTextColor,
                    ),
                  ),
                  const SizedBox(height: 4),
                  // Price Row
                  PriceText(
                    amount: product.currentPrice,
                    originalAmount: hasDiscount ? product.price : null,
                    size: PriceTextSize.sm,
                    color: primaryTextColor,
                  ),
                  const SizedBox(height: 6),
                  // Consumer-Facing Stock Status Badge
                  if (product.isSoldOut)
                    Row(
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(color: roseColor, shape: BoxShape.circle),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Sold Out',
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: roseColor,
                          ),
                        ),
                      ],
                    )
                  else if (product.stock > 0 && product.stock <= 5)
                    Row(
                      children: [
                        Icon(Icons.bolt, size: 12, color: amberColor),
                        const SizedBox(width: 2),
                        Text(
                          'Only ${product.stock} left!',
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: amberColor,
                          ),
                        ),
                      ],
                    )
                  else
                    Row(
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: isDark ? C.darkMint : C.lightMint,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'In Stock',
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: isDark ? C.darkMint : C.lightMint,
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 8),
                  // Action Button
                  SizedBox(
                    width: double.infinity,
                    height: 32,
                    child: ElevatedButton(
                      onPressed: product.isSoldOut
                          ? null
                          : () {
                              HapticFeedback.lightImpact();
                              onAddToCart();
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: product.isSoldOut
                            ? (isDark ? C.darkRaised : const Color(0xFFE5E7EB))
                            : (isLive ? amberColor : (isDark ? C.darkRaised : const Color(0xFFF3F4F6))),
                        foregroundColor: product.isSoldOut
                            ? muteTextColor
                            : (isLive ? onAmberColor : primaryTextColor),
                        disabledBackgroundColor: isDark ? C.darkRaised : const Color(0xFFE5E7EB),
                        disabledForegroundColor: muteTextColor,
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(C.radiusCard),
                          side: BorderSide(
                            color: product.isSoldOut ? Colors.transparent : (isLive ? Colors.transparent : cardBorder),
                          ),
                        ),
                      ),
                      child: Text(
                        product.isSoldOut
                            ? 'SOLD OUT'
                            : (isLive ? '⚡ QUICK RESERVE' : 'ADD TO CART'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.manrope(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ),
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
      color: isDark ? C.darkRaised : const Color(0xFFF3F4F6),
      child: Center(
        child: Icon(
          Icons.shopping_bag_outlined,
          color: isDark ? C.darkTextMute : const Color(0xFF9CA3AF),
          size: 34,
        ),
      ),
    );
  }
}
