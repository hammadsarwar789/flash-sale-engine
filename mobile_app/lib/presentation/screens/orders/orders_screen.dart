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
import 'package:mobile_app/presentation/widgets/empty_state_widget.dart';
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
    final chipBarBg = isDark ? C.darkRaised : const Color(0xFFF9FAFB);
    final cardBorder = isDark ? C.darkLine : const Color(0xFFE5E7EB);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
        title: Text(
          'Orders',
          style: GoogleFonts.sora(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: primaryTextColor,
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
            ? EmptyStateWidget.unauthenticated(
                context,
                title: 'Sign in to view orders',
                message: 'Track your packages, view past orders, and manage returns.',
                onSignIn: () => context.push('/login', extra: {'returnTo': '/orders'}),
              )
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
                          separatorBuilder: (_, _) => const SizedBox(width: 8),
                          itemBuilder: (context, idx) {
                            final statusValues = ['ALL', 'PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
                            final statusLabels = ['All', 'Pending', 'Paid', 'Shipped', 'Delivered', 'Cancelled'];
                            final val = statusValues[idx];
                            final label = statusLabels[idx];
                            final isSelected = _filterStatus == val;

                            return ChoiceChip(
                              key: ValueKey('status_chip_$val'),
                              label: Text(label),
                              showCheckmark: false,
                              selected: isSelected,
                              selectedColor: amberColor,
                              backgroundColor: cardBg,
                              labelStyle: GoogleFonts.manrope(
                                fontSize: 11,
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                color: isSelected ? onAmberColor : secondaryTextColor,
                              ),
                              side: BorderSide(
                                color: isSelected ? amberColor : cardBorder,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(C.radiusCard),
                              ),
                              padding: const EdgeInsets.symmetric(horizontal: 10),
                              onSelected: (_) => setState(() => _filterStatus = val),
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
                                      child: const Text('Try again'),
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
                              return EmptyStateWidget.ordersEmpty(
                                onBrowseDeals: () => context.go('/home'),
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
    if (raw == null || raw.isEmpty) return 'Recent';
    try {
      final parsed = DateTime.parse(raw).toLocal();
      return DateFormat('MMM d, yyyy • h:mm a').format(parsed);
    } catch (_) {
      return raw;
    }
  }

  Widget _buildOrderCard(OrderModel order) {
    final idStr = order.id.toString();
    final shortId = idStr.length > 8 ? idStr.substring(0, 8) : idStr;
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
          boxShadow: isDark
              ? null
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 6,
                    offset: const Offset(0, 1),
                  ),
                ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Order #$shortId',
                  style: GoogleFonts.manrope(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
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
                  '${order.items.length} ${order.items.length == 1 ? 'item' : 'items'}',
                  style: GoogleFonts.manrope(fontSize: 12, color: muteTextColor),
                ),
                PriceText(amount: order.totalAmount, size: PriceTextSize.md),
              ],
            ),
            const SizedBox(height: 10),

            Row(
              children: [
                Expanded(
                  child: Text(
                    _formatOrderTimestamp(order.createdAt),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.manrope(fontSize: 11, color: muteTextColor),
                  ),
                ),
                const SizedBox(width: 8),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'View details',
                      style: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.w600, color: amberColor),
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
}
