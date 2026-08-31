import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/tokens.dart';
import '../../data/models/product_model.dart';
import 'price_text.dart';
import 'stock_progress_bar.dart';

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
            color: product.isSoldOut ? C.line : (isLive ? C.amber.withValues(alpha: 0.4) : C.line),
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
                  product.imageUrl != null && product.imageUrl!.isNotEmpty
                      ? Image.network(
                          product.imageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => _buildPlaceholder(),
                        )
                      : _buildPlaceholder(),
                  if (hasDiscount)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: C.amber,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          '-${product.discountPercentage}%',
                          style: GoogleFonts.jetBrainsMono(
                            color: C.onAmber,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            fontFeatures: [const FontFeature.tabularFigures()],
                          ),
                        ),
                      ),
                    ),
                  if (isLive)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: C.amberSoft,
                          borderRadius: BorderRadius.circular(C.radiusPill),
                          border: Border.all(color: C.amber.withValues(alpha: 0.5)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(width: 5, height: 5, decoration: const BoxDecoration(color: C.amber, shape: BoxShape.circle)),
                            const SizedBox(width: 4),
                            Text(
                              'LIVE',
                              style: GoogleFonts.jetBrainsMono(color: C.amber, fontSize: 9, fontWeight: FontWeight.bold),
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
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (product.categoryName != null)
                    Text(
                      product.categoryName!.toUpperCase(),
                      style: GoogleFonts.jetBrainsMono(
                        color: C.textMute,
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                      ),
                    ),
                  const SizedBox(height: 2),
                  Text(
                    product.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: C.text,
                    ),
                  ),
                  const SizedBox(height: 4),
                  PriceText(
                    amount: product.currentPrice,
                    originalAmount: hasDiscount ? product.price : null,
                    size: PriceTextSize.md,
                  ),
                  const SizedBox(height: 6),
                  StockProgressBar(
                    stock: product.stock,
                    initialStock: product.initialStock,
                    variant: StockBarVariant.continuous,
                  ),
                  const SizedBox(height: 8),
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
                        backgroundColor: isLive ? C.amber : C.raised,
                        foregroundColor: isLive ? C.onAmber : C.text,
                        padding: EdgeInsets.zero,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(C.radiusCard),
                          side: BorderSide(color: isLive ? Colors.transparent : C.line),
                        ),
                      ),
                      child: Text(
                        product.isSoldOut ? 'SOLD OUT' : (isLive ? '⚡ QUICK RESERVE' : 'ADD TO CART'),
                        style: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.w700),
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
        child: Icon(Icons.shopping_bag_outlined, color: C.textMute, size: 36),
      ),
    );
  }
}
