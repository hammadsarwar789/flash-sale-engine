import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/tokens.dart';

enum StockBarVariant { segmented, continuous }

class StockProgressBar extends StatelessWidget {
  final int stock;
  final int initialStock;
  final StockBarVariant variant;

  const StockProgressBar({
    super.key,
    required this.stock,
    this.initialStock = 50,
    this.variant = StockBarVariant.continuous,
  });

  @override
  Widget build(BuildContext context) {
    final max = initialStock > 0 ? initialStock : 50;
    final ratio = (stock / max).clamp(0.0, 1.0);
    final isSoldOut = stock <= 0;
    final isUrgent = stock > 0 && (stock <= 5 || ratio <= 0.15);
    final isMedium = !isUrgent && !isSoldOut && ratio <= 0.4;

    Color barColor;
    String statusText;

    if (isSoldOut) {
      barColor = C.rose;
      statusText = 'SOLD OUT';
    } else if (isUrgent) {
      barColor = C.amber;
      statusText = 'CRITICAL: $stock LEFT';
    } else if (isMedium) {
      barColor = C.amber;
      statusText = '$stock UNITS REMAINING';
    } else {
      barColor = C.mint;
      statusText = 'IN STOCK ($stock UNITS)';
    }

    if (variant == StockBarVariant.segmented) {
      const totalBlocks = 8;
      final filledBlocks = isSoldOut ? 0 : (ratio * totalBlocks).ceil().clamp(1, totalBlocks);
      final segmentStr = '▓' * filledBlocks + '░' * (totalBlocks - filledBlocks);

      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            segmentStr,
            style: GoogleFonts.jetBrainsMono(
              fontSize: 11,
              color: barColor,
              letterSpacing: 1,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            '$stock LEFT',
            style: GoogleFonts.jetBrainsMono(
              fontSize: 10,
              color: barColor,
              fontWeight: FontWeight.w700,
              fontFeatures: [const FontFeature.tabularFigures()],
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              statusText,
              style: GoogleFonts.jetBrainsMono(
                color: isUrgent ? C.amber : C.textDim,
                fontSize: 10,
                fontWeight: isUrgent ? FontWeight.w800 : FontWeight.w600,
                letterSpacing: 0.3,
                fontFeatures: [const FontFeature.tabularFigures()],
              ),
            ),
            Text(
              '${(ratio * 100).toInt()}%',
              style: GoogleFonts.jetBrainsMono(
                color: barColor,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                fontFeatures: [const FontFeature.tabularFigures()],
              ),
            ),
          ],
        ),
        const SizedBox(height: 5),
        ClipRRect(
          borderRadius: BorderRadius.circular(2),
          child: LinearProgressIndicator(
            value: isSoldOut ? 0.0 : ratio,
            minHeight: 4,
            backgroundColor: C.raised,
            valueColor: AlwaysStoppedAnimation<Color>(barColor),
          ),
        ),
      ],
    );
  }
}
