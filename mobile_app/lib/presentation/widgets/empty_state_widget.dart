import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';

/// Unified Empty & Unauthenticated State Component
/// Anchored at ~35% from the top viewport to avoid dead-center vertical float,
/// featuring a 64px rounded themed icon container, clean sans-serif typography,
/// and standardized 44px Sentence-case CTA buttons.
class EmptyStateWidget extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final String? ctaLabel;
  final VoidCallback? onCtaPressed;
  final Widget? secondaryAction;

  const EmptyStateWidget({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.ctaLabel,
    this.onCtaPressed,
    this.secondaryAction,
  });

  /// Factory helper for Signed-Out State (Orders & Account)
  factory EmptyStateWidget.unauthenticated(
    BuildContext context, {
    required String title,
    required String message,
    required VoidCallback onSignIn,
    String ctaLabel = 'Sign in',
    IconData icon = Icons.person_outline,
  }) {
    return EmptyStateWidget(
      icon: icon,
      title: title,
      message: message,
      ctaLabel: ctaLabel,
      onCtaPressed: onSignIn,
    );
  }

  /// Factory helper for Empty Saved/Wishlist
  factory EmptyStateWidget.savedEmpty({
    required VoidCallback onBrowseDeals,
  }) {
    return EmptyStateWidget(
      icon: Icons.favorite_border,
      title: 'Nothing saved yet',
      message: 'Tap the heart on any product to save it here',
      ctaLabel: 'Browse deals',
      onCtaPressed: onBrowseDeals,
    );
  }

  /// Factory helper for Empty Orders
  factory EmptyStateWidget.ordersEmpty({
    required VoidCallback onBrowseDeals,
  }) {
    return EmptyStateWidget(
      icon: Icons.inventory_2_outlined,
      title: 'No orders yet',
      message: 'When you place an order, it will appear here',
      ctaLabel: 'Browse deals',
      onCtaPressed: onBrowseDeals,
    );
  }

  /// Factory helper for Empty Cart
  factory EmptyStateWidget.cartEmpty({
    required VoidCallback onBrowseDeals,
  }) {
    return EmptyStateWidget(
      icon: Icons.shopping_bag_outlined,
      title: 'Your cart is empty',
      message: 'Add items to your cart to checkout',
      ctaLabel: 'Browse deals',
      onCtaPressed: onBrowseDeals,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final amberColor = isDark ? C.darkAmber : C.lightAmber;
    final onAmberColor = isDark ? C.darkOnAmber : Colors.white;
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);

    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // 64px rounded icon container with amber-tinted background
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: amberColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: amberColor.withValues(alpha: 0.24),
                        width: 1,
                      ),
                    ),
                    child: Icon(
                      icon,
                      size: 30,
                      color: amberColor,
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Title (Semi-bold, 17px-18px)
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: GoogleFonts.sora(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: primaryTextColor,
                      letterSpacing: -0.2,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Subtitle (Manrope, 13px)
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 320),
                    child: Text(
                      message,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.manrope(
                        fontSize: 13,
                        height: 1.45,
                        color: muteTextColor,
                      ),
                    ),
                  ),

                  // CTA Button (44px height, Sentence case)
                  if (ctaLabel != null && onCtaPressed != null) ...[
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: onCtaPressed,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: amberColor,
                        foregroundColor: onAmberColor,
                        elevation: 0,
                        minimumSize: const Size(160, C.heightButtonPrimary),
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(C.radiusCard),
                        ),
                      ),
                      child: Text(
                        ctaLabel!,
                        style: GoogleFonts.manrope(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],

                  if (secondaryAction != null) ...[
                    const SizedBox(height: 12),
                    secondaryAction!,
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
