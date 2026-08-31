import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/presentation/widgets/price_text.dart';
import 'package:mobile_app/presentation/widgets/stock_progress_bar.dart';

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
    final hasDiscount = product.discountPercentage > 0 && product.salePrice != null;
    final isLive = product.stock > 0 && product.stock <= 15;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: C.surface,
          borderRadius: BorderRadius.circular(C.radiusCard),
          border: Border.all(
            color: product.isSoldOut ? C.line : (isLive ? C.amber.withOpacity(0.4) : C.line),
            width: 1,
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image & Badges
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  (product.imageUrl != null && (product.imageUrl?.isNotEmpty ?? false))
                      ? Image.network(
                          product.imageUrl ?? '',
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => _buildPlaceholder(),
                        )
                      : _buildPlaceholder(),
                  if (hasDiscount)
                    Positioned(
                      top: 6,
                      left: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: C.amber,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '-${product.discountPercentage}%',
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: C.onAmber,
                          ),
                        ),
                      ),
                    ),
                  if (isLive && !product.isSoldOut)
                    Positioned(
                      top: 6,
                      right: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: C.amberSoft,
                          borderRadius: BorderRadius.circular(C.radiusPill),
                          border: Border.all(color: C.amber.withOpacity(0.5)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(width: 4, height: 4, decoration: const BoxDecoration(color: C.amber, shape: BoxShape.circle)),
                            const SizedBox(width: 3),
                            Text(
                              'LIVE',
                              style: GoogleFonts.jetBrainsMono(color: C.amber, fontSize: 8, fontWeight: FontWeight.w800),
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
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (product.categoryName != null && (product.categoryName?.isNotEmpty ?? false))
                    Text(
                      (product.categoryName ?? '').toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.jetBrainsMono(
                        color: C.textMute,
                        fontSize: 8,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                      ),
                    ),
                  const SizedBox(height: 1),
                  Text(
                    product.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: C.text,
                    ),
                  ),
                  const SizedBox(height: 3),
                  PriceText(
                    amount: product.currentPrice,
                    originalAmount: hasDiscount ? product.price : null,
                    size: PriceTextSize.sm,
                  ),
                  const SizedBox(height: 5),
                  StockProgressBar(
                    stock: product.stock,
                    initialStock: product.initialStock,
                    variant: StockBarVariant.continuous,
                  ),
                  const SizedBox(height: 6),
                  SizedBox(
                    width: double.infinity,
                    height: 28,
                    child: ElevatedButton(
                      onPressed: product.isSoldOut
                          ? null
                          : () {
                              HapticFeedback.lightImpact();
                              onAddToCart();
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isLive ? C.amber : C.raised,
                        foregroundColor: isLive ? C.onAmber : C.text,
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(C.radiusCard),
                          side: BorderSide(color: isLive ? Colors.transparent : C.line),
                        ),
                      ),
                      child: Text(
                        product.isSoldOut ? 'SOLD OUT' : (isLive ? '⚡ QUICK RESERVE' : 'ADD TO CART'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.manrope(fontSize: 10, fontWeight: FontWeight.w800),
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

  Widget _buildPlaceholder() {
    return Container(
      color: C.raised,
      child: const Center(
        child: Icon(Icons.shopping_bag_outlined, color: C.textMute, size: 32),
      ),
    );
  }
}
