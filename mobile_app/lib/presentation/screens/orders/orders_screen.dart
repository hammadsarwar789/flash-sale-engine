import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/order_model.dart';
import 'package:mobile_app/logic/orders/order_bloc.dart';
import 'package:mobile_app/logic/orders/order_event.dart';
import 'package:mobile_app/logic/orders/order_state.dart';
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
    context.read<OrderBloc>().add(LoadOrdersEvent());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: C.base,
      appBar: AppBar(
        backgroundColor: C.surface,
        title: Text(
          'Order Ledger',
          style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: C.text),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: C.text),
          onPressed: () => context.go('/home'),
        ),
      ),
      body: RefreshIndicator(
        color: C.amber,
        backgroundColor: C.raised,
        onRefresh: () async {
          context.read<OrderBloc>().add(LoadOrdersEvent());
        },
        child: Column(
          children: [
            // Status Filter Chips
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: C.raised,
              child: SizedBox(
                height: 32,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: 6,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (context, idx) {
                    final statuses = ['ALL', 'PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
                    final s = statuses[idx];
                    final isSelected = _filterStatus == s;

                    return ChoiceChip(
                      label: Text(s),
                      selected: isSelected,
                      selectedColor: C.amber,
                      backgroundColor: C.surface,
                      labelStyle: GoogleFonts.jetBrainsMono(
                        fontSize: 10,
                        fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                        color: isSelected ? C.onAmber : C.textDim,
                      ),
                      side: BorderSide(color: isSelected ? C.amber : C.line),
                      onSelected: (_) => setState(() => _filterStatus = s),
                    );
                  },
                ),
              ),
            ),

            // Orders List
            Expanded(
              child: BlocBuilder<OrderBloc, OrderState>(
                builder: (context, state) {
                  if (state is OrderLoading) {
                    return const Center(child: CircularProgressIndicator(color: C.amber));
                  } else if (state is OrderError) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline, size: 44, color: C.rose),
                            const SizedBox(height: 12),
                            Text(state.message, textAlign: TextAlign.center, style: GoogleFonts.manrope(color: C.textMute)),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: () => context.read<OrderBloc>().add(LoadOrdersEvent()),
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
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.receipt_long_outlined, size: 48, color: C.textMute),
                            const SizedBox(height: 12),
                            Text(
                              'NO ORDERS RECORDED',
                              style: GoogleFonts.jetBrainsMono(fontSize: 13, fontWeight: FontWeight.bold, color: C.textDim),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'No transactions match the selected filter.',
                              style: GoogleFonts.manrope(fontSize: 12, color: C.textMute),
                            ),
                          ],
                        ),
                      );
                    }

                    return ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: filtered.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
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
    );
  }

  Widget _buildOrderCard(OrderModel order) {
    final idStr = order.id.toString();
    return GestureDetector(
      onTap: () => context.push('/order/${order.id}'),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: C.surface,
          borderRadius: BorderRadius.circular(C.radiusCard),
          border: Border.all(color: C.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'ORD-${idStr.length > 8 ? idStr.substring(0, 8).toUpperCase() : idStr}',
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: C.text,
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
                  style: GoogleFonts.jetBrainsMono(fontSize: 11, color: C.textMute),
                ),
                PriceText(amount: order.totalAmount, size: PriceTextSize.md),
              ],
            ),
            const SizedBox(height: 8),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  order.createdAt?.toString() ?? 'RECENT',
                  style: GoogleFonts.jetBrainsMono(fontSize: 10, color: C.textMute),
                ),
                Row(
                  children: [
                    Text(
                      'VIEW TIMELINE',
                      style: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.bold, color: C.amber),
                    ),
                    const Icon(Icons.chevron_right, size: 16, color: C.amber),
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
