import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/order_model.dart';
import 'package:mobile_app/presentation/widgets/price_text.dart';

class OrderSuccessScreen extends StatelessWidget {
  final OrderModel order;

  const OrderSuccessScreen({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final secondaryTextColor = isDark ? C.darkTextDim : const Color(0xFF4B5563);
    final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);
    final amberColor = isDark ? C.darkAmber : C.lightAmber;
    final onAmberColor = isDark ? C.darkOnAmber : Colors.white;
    final cardBg = isDark ? C.darkSurface : Colors.white;
    final cardBorder = isDark ? C.darkLine : const Color(0xFFE5E7EB);
    final mintColor = isDark ? C.darkMint : C.lightMint;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) context.go('/home');
      },
      child: Scaffold(
        backgroundColor: theme.scaffoldBackgroundColor,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              physics: const BouncingScrollPhysics(),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Success Signal Icon
                  Center(
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: mintColor.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                        border: Border.all(color: mintColor.withValues(alpha: 0.4), width: 2),
                      ),
                      child: Center(
                        child: Icon(Icons.check_circle, size: 44, color: mintColor),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Header Title
                  Text(
                    'SETTLEMENT COMPLETE',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.sora(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: primaryTextColor,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Your inventory holds have been atomically locked and enqueued for fulfillment.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.manrope(
                      fontSize: 13,
                      color: secondaryTextColor,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Order Receipt Card
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(C.radiusCard),
                      border: Border.all(color: cardBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'ORDER REFERENCE',
                              style: GoogleFonts.jetBrainsMono(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: muteTextColor,
                                letterSpacing: 0.5,
                              ),
                            ),
                            Text(
                              '#ORD-${order.shortId}',
                              style: GoogleFonts.jetBrainsMono(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: amberColor,
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'STATUS',
                              style: GoogleFonts.jetBrainsMono(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: muteTextColor,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: mintColor.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                order.status.toUpperCase(),
                                style: GoogleFonts.jetBrainsMono(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: mintColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'TOTAL SETTLED',
                              style: GoogleFonts.sora(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: primaryTextColor,
                              ),
                            ),
                            PriceText(
                              amount: order.totalAmount,
                              size: PriceTextSize.lg,
                              color: primaryTextColor,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Direct CTA 1: View Order in Ledger
                  SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      onPressed: () => context.go('/orders'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: amberColor,
                        foregroundColor: onAmberColor,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(C.radiusCard),
                        ),
                      ),
                      child: Text(
                        'VIEW ORDER IN LEDGER →',
                        style: GoogleFonts.manrope(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Direct CTA 2: Continue Browsing
                  SizedBox(
                    height: 44,
                    child: OutlinedButton(
                      onPressed: () => context.go('/home'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: secondaryTextColor,
                        side: BorderSide(color: cardBorder),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(C.radiusCard),
                        ),
                      ),
                      child: Text(
                        'CONTINUE BROWSING',
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
          ),
        ),
      ),
    );
  }
}
