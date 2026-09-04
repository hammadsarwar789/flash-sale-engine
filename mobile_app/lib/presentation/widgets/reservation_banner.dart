import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/theme_controller.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/presentation/routes/app_router.dart';

/// Immutable payload model for an active cart reservation toast banner.
class ReservationData {
  final String productName;
  final int quantity;
  final bool isOnCartOrCheckout;
  final Duration duration;

  const ReservationData({
    required this.productName,
    this.quantity = 1,
    this.isOnCartOrCheckout = false,
    this.duration = const Duration(milliseconds: 4500),
  });
}

/// Centralized, thread-safe controller managing the reservation banner lifecycle,
/// strict auto-dismiss timers, manual dismissal, and clean state resets.
class ReservationBannerController {
  ReservationBannerController._();
  static final ReservationBannerController instance = ReservationBannerController._();

  final ValueNotifier<ReservationData?> activeReservation = ValueNotifier<ReservationData?>(null);
  Timer? _autoDismissTimer;
  VoidCallback? _onDismissHandler;

  void registerDismissHandler(VoidCallback handler) {
    _onDismissHandler = handler;
  }

  void unregisterDismissHandler() {
    _onDismissHandler = null;
  }

  /// Triggers or refreshes the reservation banner.
  /// Strictly cancels any previous timer and initializes a 4000ms - 5000ms auto-dismiss lifecycle.
  void show({
    required String productName,
    int quantity = 1,
    bool isOnCartOrCheckout = false,
    Duration duration = const Duration(milliseconds: 4500),
  }) {
    // 1. Properly clear active timer if a new reservation action triggers before duration expires
    _autoDismissTimer?.cancel();

    // 2. Update reactive state payload
    activeReservation.value = ReservationData(
      productName: productName,
      quantity: quantity,
      isOnCartOrCheckout: isOnCartOrCheckout,
      duration: duration,
    );

    // 3. Start auto-dismiss timer
    _autoDismissTimer = Timer(duration, () {
      hide();
    });
  }

  /// Manually or lifecycle-driven dismissal.
  /// Cancels the active timer immediately and requests an exit transition.
  void hide() {
    _autoDismissTimer?.cancel();
    _autoDismissTimer = null;

    if (_onDismissHandler != null) {
      _onDismissHandler!();
    } else {
      activeReservation.value = null;
    }
  }

  /// Forceful immediate clear without animation if component unmounts
  void dispose() {
    _autoDismissTimer?.cancel();
    _autoDismissTimer = null;
    activeReservation.value = null;
  }
}

/// Floating Banner Overlay placed above all routes in MaterialApp.router builder.
/// Features:
/// 1. Auto-dismiss timer (4000ms - 5000ms).
/// 2. Top-right manual dismiss (✕ icon) with timer cancellation.
/// 3. Smooth exit transition (fade-out + slide-down).
/// 4. Layout positioning above bottom navigation bar (Floor, Saved, Vault, Orders, Account) and safe areas.
/// 5. Immediate pointer-events: none (IgnorePointer) when hidden or exiting.
class ReservationBannerOverlay extends StatefulWidget {
  const ReservationBannerOverlay({super.key});

  @override
  State<ReservationBannerOverlay> createState() => _ReservationBannerOverlayState();
}

class _ReservationBannerOverlayState extends State<ReservationBannerOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animController;
  late final Animation<Offset> _slideAnimation;
  late final Animation<double> _fadeAnimation;

  ReservationData? _displayedData;
  bool _isInteractive = false;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 280),
      reverseDuration: const Duration(milliseconds: 220),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.4),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutCubic,
      reverseCurve: Curves.easeInCubic,
    ));

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
      reverseCurve: Curves.easeIn,
    ));

    ReservationBannerController.instance.registerDismissHandler(_handleDismiss);
    ReservationBannerController.instance.activeReservation.addListener(_onReservationChanged);
  }

  @override
  void dispose() {
    ReservationBannerController.instance.unregisterDismissHandler();
    ReservationBannerController.instance.activeReservation.removeListener(_onReservationChanged);
    ReservationBannerController.instance.dispose();
    _animController.dispose();
    super.dispose();
  }

  void _onReservationChanged() {
    final newData = ReservationBannerController.instance.activeReservation.value;
    if (newData != null) {
      setState(() {
        _displayedData = newData;
        _isInteractive = true;
      });
      _animController.forward(from: 0.0);
    }
  }

  void _handleDismiss() {
    if (!mounted || _displayedData == null) return;
    setState(() {
      // Immediately disable hit testing so touches pass through while animating out (pointer-events: none)
      _isInteractive = false;
    });
    _animController.reverse().then((_) {
      if (mounted && !_isInteractive) {
        setState(() {
          _displayedData = null;
        });
        ReservationBannerController.instance.activeReservation.value = null;
      }
    });
  }

  void _onManualDismiss() {
    ReservationBannerController.instance.hide();
  }

  void _onViewCart() {
    ReservationBannerController.instance.hide();
    AppRouter.router.go('/cart');
  }

  @override
  Widget build(BuildContext context) {
    if (_displayedData == null) {
      return const SizedBox.shrink();
    }

    final data = _displayedData!;
    final text = data.quantity > 1
        ? 'RESERVED: ${data.productName} (QTY ${data.quantity})'
        : 'RESERVED: ${data.productName}';

    // Measure safe area insets and determine bottom offset based on active route
    final mediaQuery = MediaQuery.of(context);
    final bottomInset = mediaQuery.padding.bottom;
    final currentPath = AppRouteObserver.currentPath;

    double bottomBarHeight = 0;
    if (currentPath.startsWith('/product/')) {
      // ProductDetailScreen sticky bottom bar height
      bottomBarHeight = 72.0;
    } else if (currentPath == '/home' ||
        currentPath == '/wishlist' ||
        currentPath == '/cart' ||
        currentPath == '/orders' ||
        currentPath == '/profile' ||
        currentPath.isEmpty) {
      // MainLayoutScreen bottom navigation bar (Floor, Saved, Vault, Orders, Account)
      bottomBarHeight = kBottomNavigationBarHeight;
    }

    final bottomPosition = bottomBarHeight + bottomInset + 12.0;

    return AnimatedBuilder(
      animation: ThemeController.instance,
      builder: (context, _) {
        final isDark = ThemeController.instance.isDark;
        final cardBg = isDark ? C.darkSurface : Colors.white;
        final cardBorder = isDark ? C.darkLine : const Color(0xFFE5E7EB);
        final amberColor = isDark ? C.darkAmber : C.lightAmber;
        final onAmberColor = isDark ? C.darkOnAmber : Colors.white;
        final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
        final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);

        return Positioned(
          left: 16,
          right: 16,
          bottom: bottomPosition,
          child: IgnorePointer(
            ignoring: !_isInteractive, // pointer-events: none when exiting or hidden
            child: SlideTransition(
              position: _slideAnimation,
              child: FadeTransition(
                opacity: _fadeAnimation,
                child: Material(
                  color: Colors.transparent,
                  child: Container(
                    decoration: BoxDecoration(
                      color: cardBg,
                      borderRadius: BorderRadius.circular(C.radiusCard),
                      border: Border.all(color: cardBorder, width: 1),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: isDark ? 0.45 : 0.12),
                          blurRadius: 18,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Stack(
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(left: 12, right: 38, top: 11, bottom: 11),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(5),
                                decoration: BoxDecoration(
                                  color: amberColor.withValues(alpha: 0.16),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Icon(Icons.bolt, color: amberColor, size: 16),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  text,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.jetBrainsMono(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: primaryTextColor,
                                    letterSpacing: -0.1,
                                  ),
                                ),
                              ),
                              if (!data.isOnCartOrCheckout) ...[
                                const SizedBox(width: 8),
                                InkWell(
                                  onTap: _onViewCart,
                                  borderRadius: BorderRadius.circular(6),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: amberColor,
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      'VIEW CART',
                                      style: GoogleFonts.jetBrainsMono(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w800,
                                        color: onAmberColor,
                                        letterSpacing: 0.4,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        // Manual Dismiss Button (✕ icon) in the top-right corner
                        Positioned(
                          top: 4,
                          right: 4,
                          child: GestureDetector(
                            behavior: HitTestBehavior.opaque,
                            onTap: _onManualDismiss,
                            child: Padding(
                              padding: const EdgeInsets.all(6),
                              child: Icon(
                                Icons.close,
                                size: 15,
                                color: muteTextColor,
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
          ),
        );
      },
    );
  }
}
