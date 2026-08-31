import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../core/theme/tokens.dart';

enum PriceTextSize { sm, md, lg, xl }

class PriceText extends StatelessWidget {
  final double amount;
  final double? originalAmount;
  final PriceTextSize size;
  final Color? color;

  const PriceText({
    super.key,
    required this.amount,
    this.originalAmount,
    this.size = PriceTextSize.md,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat.currency(symbol: '\$', decimalDigits: 2);
    final formatted = currencyFormatter.format(amount);

    double fontSize;
    FontWeight fontWeight;

    switch (size) {
      case PriceTextSize.sm:
        fontSize = 12;
        fontWeight = FontWeight.w600;
        break;
      case PriceTextSize.md:
        fontSize = 14;
        fontWeight = FontWeight.w700;
        break;
      case PriceTextSize.lg:
        fontSize = 18;
        fontWeight = FontWeight.w700;
        break;
      case PriceTextSize.xl:
        fontSize = 24;
        fontWeight = FontWeight.w800;
        break;
    }

    final orig = originalAmount;

    return FittedBox(
      fit: BoxFit.scaleDown,
      alignment: Alignment.centerLeft,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Text(
            formatted,
            style: GoogleFonts.jetBrainsMono(
              fontSize: fontSize,
              fontWeight: fontWeight,
              color: color ?? C.text,
              fontFeatures: [const FontFeature.tabularFigures()],
            ),
          ),
          if (orig != null && orig > amount) ...[
            const SizedBox(width: 6),
            Text(
              currencyFormatter.format(orig),
              style: GoogleFonts.jetBrainsMono(
                fontSize: fontSize * 0.75,
                color: C.textMute,
                decoration: TextDecoration.lineThrough,
                decorationColor: C.textMute,
                fontFeatures: [const FontFeature.tabularFigures()],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
