import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/theme_controller.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/order_model.dart';
import 'package:mobile_app/logic/auth/auth_bloc.dart';
import 'package:mobile_app/logic/auth/auth_state.dart';
import 'package:mobile_app/logic/orders/order_bloc.dart';
import 'package:mobile_app/logic/orders/order_event.dart';
import 'package:mobile_app/logic/orders/order_state.dart';
import 'package:intl/intl.dart';
import 'package:mobile_app/presentation/widgets/price_text.dart';
import 'package:mobile_app/presentation/widgets/status_pill_widget.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  String _filterStatus = 'ALL';

  @override
  void initState() {
    super.initState();
    final authState = context.read<AuthBloc>().state;
    if (authState is Authenticated) {
      context.read<OrderBloc>().add(LoadOrdersEvent());
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final amberColor = isDark ? C.darkAmber : C.lightAmber;
    final onAmberColor = isDark ? C.darkOnAmber : Colors.white;
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final secondaryTextColor = isDark ? C.darkTextDim : const Color(0xFF4B5563);
    final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);
    final cardBg = isDark ? C.darkSurface : Colors.white;
    final chipBarBg = isDark ? C.darkRaised : const Color(0xFFF1EFEA);
    final cardBorder = isDark ? C.darkLine : const Color(0xFFE5E7EB);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
        title: Text(
          'ORDERS',
          style: GoogleFonts.sora(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: primaryTextColor,
            letterSpacing: 0.5,
          ),
        ),
        actions: [
          AnimatedBuilder(
            animation: ThemeController.instance,
            builder: (context, _) {
              final isCurrentDark = ThemeController.instance.isDark;
              return IconButton(
                icon: Icon(
                  isCurrentDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                  color: isCurrentDark ? amberColor : secondaryTextColor,
                  size: 22,
                ),
                tooltip: isCurrentDark ? 'Switch to Day Mode' : 'Switch to Night Mode',
                onPressed: () {
                  HapticFeedback.lightImpact();
                  ThemeController.instance.toggleTheme();
                },
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: BlocListener<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is Authenticated) {
            context.read<OrderBloc>().add(LoadOrdersEvent());
          }
        },
        child: authState is! Authenticated
            ? _buildUnauthenticatedView(isDark, primaryTextColor, muteTextColor, amberColor)
            : RefreshIndicator(
                color: amberColor,
                backgroundColor: cardBg,
                onRefresh: () async {
                  context.read<OrderBloc>().add(LoadOrdersEvent());
                },
                child: Column(
                  children: [
                    // Status Filter Chips
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      color: chipBarBg,
                      child: SizedBox(
                        height: 32,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                          itemCount: 6,
                          separatorBuilder: (_, _) => const SizedBox(width: 6),
                          itemBuilder: (context, idx) {
                            final statuses = ['ALL', 'PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
                            final s = statuses[idx];
                            final isSelected = _filterStatus == s;

                            return ChoiceChip(
                              key: ValueKey('status_chip_$s'),
                              label: Text(s),
                              selected: isSelected,
                              selectedColor: amberColor,
                              backgroundColor: cardBg,
                              labelStyle: GoogleFonts.jetBrainsMono(
                                fontSize: 10,
                                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                                color: isSelected ? onAmberColor : secondaryTextColor,
                              ),
                              side: BorderSide(color: isSelected ? amberColor : cardBorder),
                              onSelected: (_) => setState(() => _filterStatus = s),
                            );
                          },
                        ),
                      ),
                    ),

                    // Orders List / States
                    Expanded(
                      child: BlocBuilder<OrderBloc, OrderState>(
                        builder: (context, state) {
                          if (state is OrderInitial) {
                            context.read<OrderBloc>().add(LoadOrdersEvent());
                            return Center(child: CircularProgressIndicator(color: amberColor));
                          } else if (state is OrderLoading) {
                            return Center(child: CircularProgressIndicator(color: amberColor));
                          } else if (state is OrderError) {
                            final roseColor = isDark ? C.darkRose : C.lightRose;
                            return Center(
                              child: Padding(
                                padding: const EdgeInsets.all(24),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.error_outline, size: 44, color: roseColor),
                                    const SizedBox(height: 12),
                                    Text(
                                      state.message,
                                      textAlign: TextAlign.center,
                                      style: GoogleFonts.manrope(color: muteTextColor),
                                    ),
                                    const SizedBox(height: 16),
                                    ElevatedButton(
                                      onPressed: () => context.read<OrderBloc>().add(LoadOrdersEvent()),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: amberColor,
                                        foregroundColor: onAmberColor,
                                        elevation: 0,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(C.radiusCard),
                                        ),
                                      ),
                                      child: const Text('RETRY'),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          } else if (state is OrdersLoaded) {
                            final filtered = _filterStatus == 'ALL'
                                ? state.orders
                                : state.orders.where((o) => o.status.toUpperCase() == _filterStatus).toList();

                            if (filtered.isEmpty) {
                              return ScrollConfiguration(
                                behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
                                child: Center(
                                  child: SingleChildScrollView(
                                    physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                                    padding: const EdgeInsets.all(32),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Container(
                                          width: 72,
                                          height: 72,
                                          decoration: BoxDecoration(
                                            color: isDark ? C.darkRaised : const Color(0xFFF3F4F6),
                                            shape: BoxShape.circle,
                                            border: Border.all(color: amberColor.withValues(alpha: 0.3)),
                                          ),
                                          child: Center(
                                            child: Icon(Icons.receipt_long_outlined, size: 36, color: amberColor),
                                          ),
                                        ),
                                        const SizedBox(height: 16),
                                        Text(
                                          'No Orders Yet',
                                          style: GoogleFonts.sora(
                                            fontSize: 18,
                                            fontWeight: FontWeight.w700,
                                            color: primaryTextColor,
                                          ),
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          'Your completed flash sale orders will appear here.',
                                          textAlign: TextAlign.center,
                                          style: GoogleFonts.manrope(
                                            fontSize: 13,
                                            color: muteTextColor,
                                          ),
                                        ),
                                        const SizedBox(height: 24),
                                        SizedBox(
                                          height: 44,
                                          child: ElevatedButton(
                                            onPressed: () => context.go('/home'),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: amberColor,
                                              foregroundColor: onAmberColor,
                                              elevation: 0,
                                              padding: const EdgeInsets.symmetric(horizontal: 24),
                                              shape: RoundedRectangleBorder(
                                                borderRadius: BorderRadius.circular(C.radiusCard),
                                              ),
                                            ),
                                            child: Text(
                                              'EXPLORE THE FLOOR',
                                              style: GoogleFonts.manrope(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w800,
                                                letterSpacing: 0.5,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            }

                            return ListView.separated(
                              physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                              padding: const EdgeInsets.all(16),
                              itemCount: filtered.length,
                              separatorBuilder: (_, _) => const SizedBox(height: 10),
                              itemBuilder: (context, i) {
                                final order = filtered[i];
                                return _buildOrderCard(order);
                              },
                            );
                          }
                          return const SizedBox.shrink();
                        },
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  String _formatOrderTimestamp(String? raw) {
    if (raw == null || raw.isEmpty) return 'RECENT';
    try {
      final parsed = DateTime.parse(raw).toLocal();
      return DateFormat('MMM dd, yyyy • h:mm a').format(parsed);
    } catch (_) {
      return raw;
    }
  }

  Widget _buildOrderCard(OrderModel order) {
    final idStr = order.id.toString();
    final shortId = idStr.length > 8 ? idStr.substring(0, 8).toUpperCase() : idStr.toUpperCase();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? C.darkSurface : Colors.white;
    final cardBorder = isDark ? C.darkLine : const Color(0xFFE5E7EB);
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);
    final amberColor = isDark ? C.darkAmber : C.lightAmber;

    return GestureDetector(
      key: ValueKey('order_${order.id}'),
      onTap: () => context.push('/order/${order.id}'),
      child: Container(
        padding: const EdgeInsets.all(14),
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
                  'ORD-$shortId',
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: primaryTextColor,
                  ),
                ),
                StatusPillWidget(status: order.status),
              ],
            ),
            const SizedBox(height: 10),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${order.items.length} ITEM(S)',
                  style: GoogleFonts.jetBrainsMono(fontSize: 11, color: muteTextColor),
                ),
                PriceText(amount: order.totalAmount, size: PriceTextSize.md),
              ],
            ),
            const SizedBox(height: 8),

            Row(
              children: [
                Expanded(
                  child: Text(
                    _formatOrderTimestamp(order.createdAt),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.jetBrainsMono(fontSize: 10, color: muteTextColor),
                  ),
                ),
                const SizedBox(width: 8),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'VIEW TIMELINE',
                      style: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.bold, color: amberColor),
                    ),
                    Icon(Icons.chevron_right, size: 16, color: amberColor),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUnauthenticatedView(bool isDark, Color primaryTextColor, Color muteTextColor, Color amberColor) {
    return ScrollConfiguration(
      behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
      child: Center(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: isDark ? C.darkRaised : const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(C.radiusCard),
                  border: Border.all(color: amberColor.withValues(alpha: 0.3)),
                ),
                child: Icon(Icons.receipt_long_outlined, size: 36, color: amberColor),
              ),
              const SizedBox(height: 16),
              Text(
                'Orders Authentication Required',
                textAlign: TextAlign.center,
                style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.bold, color: primaryTextColor),
              ),
              const SizedBox(height: 8),
              Text(
                'Please sign in to view your order history, delivery tracking, and settlement receipts.',
                textAlign: TextAlign.center,
                style: GoogleFonts.manrope(fontSize: 12, color: muteTextColor),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () => context.push('/login', extra: {'returnTo': '/orders'}),
                style: ElevatedButton.styleFrom(
                  backgroundColor: amberColor,
                  foregroundColor: isDark ? C.darkOnAmber : Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                ),
                child: const Text('SIGN IN TO VIEW ORDERS'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
