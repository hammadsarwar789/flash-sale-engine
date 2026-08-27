import 'package:flutter/material.dart';
import 'package:mobile_app/core/theme/app_theme.dart';
import 'package:mobile_app/core/utils/formatters.dart';
import 'package:mobile_app/data/models/product_model.dart';
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
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: product.isFlashSale ? AppColors.accentFlash.withOpacity(0.4) : AppColors.border,
            width: product.isFlashSale ? 1.5 : 1,
          ),
          boxShadow: product.isFlashSale
              ? [
                  BoxShadow(
                    color: AppColors.accentFlash.withOpacity(0.08),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  )
                ]
              : null,
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
                  if (product.isFlashSale)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.accentFlash,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.bolt, color: Colors.white, size: 12),
                            const SizedBox(width: 2),
                            Text(
                              '-${product.discountPercentage}% OFF',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
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
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (product.categoryName != null)
                    Text(
                      product.categoryName!.toUpperCase(),
                      style: const TextStyle(
                        color: AppColors.secondary,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  const SizedBox(height: 4),
                  Text(
                    product.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Text(
                        AppFormatters.formatCurrency(product.currentPrice),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      if (product.isFlashSale && product.salePrice != null) ...[
                        const SizedBox(width: 6),
                        Text(
                          AppFormatters.formatCurrency(product.price),
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textMuted,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 8),
                  StockProgressBar(
                    stock: product.stock,
                    initialStock: product.initialStock,
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: product.isSoldOut ? null : onAddToCart,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: product.isFlashSale ? AppColors.accentFlash : AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        minimumSize: Size.zero,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: Text(
                        product.isSoldOut ? 'Sold Out' : (product.isFlashSale ? '⚡ Quick Add' : 'Add to Cart'),
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
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
      color: AppColors.surfaceElevated,
      child: const Center(
        child: Icon(Icons.shopping_bag_outlined, color: AppColors.textMuted, size: 40),
      ),
    );
  }
}
