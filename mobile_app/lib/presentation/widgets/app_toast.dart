import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/presentation/routes/app_router.dart';

/// Centralized, transient toast / banner system with auto-dismiss timers,
/// route-context awareness, and strict lifetime cleanup.
class AppToast {
  static void hide([BuildContext? context]) {
    if (context != null) {
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
    } else {
      AppRouter.scaffoldMessengerKey.currentState?.hideCurrentSnackBar();
    }
  }

  static void clear([BuildContext? context]) {
    if (context != null) {
      ScaffoldMessenger.of(context).clearSnackBars();
    } else {
      AppRouter.scaffoldMessengerKey.currentState?.clearSnackBars();
    }
  }

  /// Context-aware Cart Reservation Toast
  /// Automatically omits 'VIEW CART' action when already on the /cart or /checkout screen.
  static void showReserved(
    BuildContext context, {
    required String productName,
    int quantity = 1,
  }) {
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();

    String currentPath = '';
    try {
      currentPath = GoRouterState.of(context).matchedLocation;
    } catch (_) {}

    final isOnCartOrCheckout = currentPath == '/cart' || currentPath == '/checkout';

    final text = quantity > 1
        ? 'RESERVED: $productName (QTY $quantity)'
        : 'RESERVED: $productName';

    messenger.showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.bolt, color: C.amber, size: 16),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                text,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: C.text,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: C.raised,
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
        action: isOnCartOrCheckout
            ? null
            : SnackBarAction(
                label: 'VIEW CART',
                textColor: C.amber,
                onPressed: () {
                  messenger.hideCurrentSnackBar();
                  context.go('/cart');
                },
              ),
      ),
    );
  }

  /// Success Notification with strict auto-clear timer
  static void showSuccess(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 3),
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();

    messenger.showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_outline, color: C.mint, size: 16),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: C.text,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: C.raised,
        duration: duration,
        behavior: SnackBarBehavior.floating,
        action: actionLabel != null
            ? SnackBarAction(
                label: actionLabel,
                textColor: C.mint,
                onPressed: onAction ?? () => messenger.hideCurrentSnackBar(),
              )
            : null,
      ),
    );
  }

  /// Error Notification with auto-dismiss
  static void showError(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 4),
  }) {
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();

    messenger.showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline, color: C.rose, size: 16),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: GoogleFonts.manrope(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: C.text,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: C.surface,
        duration: duration,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  /// Generic Informational Toast with optional action
  static void showInfo(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 3),
    String? actionLabel,
    VoidCallback? onAction,
  }) {
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();

    messenger.showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: GoogleFonts.manrope(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: C.text,
          ),
        ),
        backgroundColor: C.raised,
        duration: duration,
        behavior: SnackBarBehavior.floating,
        action: actionLabel != null
            ? SnackBarAction(
                label: actionLabel,
                textColor: C.amber,
                onPressed: onAction ?? () => messenger.hideCurrentSnackBar(),
              )
            : null,
      ),
    );
  }
}
