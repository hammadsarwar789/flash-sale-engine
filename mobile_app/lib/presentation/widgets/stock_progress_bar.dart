import 'package:flutter/material.dart';
import 'package:mobile_app/core/theme/app_theme.dart';

class StockProgressBar extends StatelessWidget {
  final int stock;
  final int initialStock;

  const StockProgressBar({
    super.key,
    required this.stock,
    this.initialStock = 100,
  });

  @override
  Widget build(BuildContext context) {
    final max = initialStock > 0 ? initialStock : 100;
    final ratio = (stock / max).clamp(0.0, 1.0);
    final isLowStock = stock <= 10 && stock > 0;
    final isSoldOut = stock <= 0;

    Color progressColor;
    if (isSoldOut) {
      progressColor = AppColors.textMuted;
    } else if (isLowStock) {
      progressColor = AppColors.accentFlash;
    } else {
      progressColor = AppColors.secondary;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              isSoldOut
                  ? 'SOLD OUT'
                  : (isLowStock ? '🔥 Only $stock left in stock!' : 'Available: $stock units'),
              style: TextStyle(
                color: isLowStock ? AppColors.accentFlash : AppColors.textSecondary,
                fontSize: 12,
                fontWeight: isLowStock ? FontWeight.bold : FontWeight.w500,
              ),
            ),
            Text(
              '${(ratio * 100).toInt()}%',
              style: TextStyle(
                color: progressColor,
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: ratio,
            minHeight: 6,
            backgroundColor: AppColors.surfaceElevated,
            valueColor: AlwaysStoppedAnimation<Color>(progressColor),
          ),
        ),
      ],
    );
  }
}
