import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/theme/tokens.dart';

class StatusPillWidget extends StatelessWidget {
  final String status;
  final bool showDot;

  const StatusPillWidget({
    super.key,
    required this.status,
    this.showDot = true,
  });

  @override
  Widget build(BuildContext context) {
    final s = status.toUpperCase();

    Color dotColor = C.amber;
    Color bgColor = C.amberSoft;
    Color textColor = C.amber;
    Color borderColor = C.amber.withOpacity(0.3);

    if (['PAID', 'DELIVERED', 'SETTLED', 'ACTIVE', 'IN_STOCK', 'COMPLETED', 'SYNCED'].contains(s)) {
      dotColor = C.mint;
      bgColor = C.mintSoft;
      textColor = C.mint;
      borderColor = C.mint.withOpacity(0.3);
    } else if (['SHIPPED', 'PROCESSING', 'INFO', 'OPEN'].contains(s)) {
      dotColor = C.sky;
      bgColor = C.skySoft;
      textColor = C.sky;
      borderColor = C.sky.withOpacity(0.3);
    } else if (['CANCELLED', 'FAILED', 'REFUNDED', 'OUT_OF_STOCK', 'ERROR'].contains(s)) {
      dotColor = C.rose;
      bgColor = C.roseSoft;
      textColor = C.rose;
      borderColor = C.rose.withOpacity(0.3);
    } else if (['ADMIN', 'VENDOR', 'MANAGER', 'STAFF'].contains(s)) {
      dotColor = C.violet;
      bgColor = C.violetSoft;
      textColor = C.violet;
      borderColor = C.violet.withOpacity(0.3);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(C.radiusPill),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showDot) ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: dotColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 5),
          ],
          Text(
            s,
            style: GoogleFonts.jetBrainsMono(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: textColor,
              letterSpacing: 0.5,
              fontFeatures: [const FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }
}
