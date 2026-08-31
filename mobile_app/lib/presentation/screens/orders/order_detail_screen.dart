import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/order_model.dart';
import 'package:mobile_app/data/repositories/order_repository.dart';
import 'package:mobile_app/presentation/widgets/price_text.dart';
import 'package:mobile_app/presentation/widgets/status_pill_widget.dart';

class OrderDetailScreen extends StatefulWidget {
  final dynamic orderId;

  const OrderDetailScreen({super.key, required this.orderId});

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  OrderModel? _order;
  bool _isLoading = true;
  String? _errorMessage;
  bool _isCancelling = false;

  @override
  void initState() {
    super.initState();
    _loadOrderDetail();
  }

  Future<void> _loadOrderDetail() async {
    try {
      final repo = context.read<OrderRepository>();
      final order = await repo.getOrderDetail(widget.orderId);
      if (mounted) {
        setState(() {
          _order = order;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _onCancelOrder() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: C.overlay,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(C.radiusModal)),
        title: Text('Cancel Reservation?', style: GoogleFonts.sora(fontSize: 17, fontWeight: FontWeight.bold, color: C.text)),
        content: Text('This will release your stock hold back to the floor inventory pool.', style: GoogleFonts.manrope(fontSize: 13, color: C.textDim)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('KEEP HOLD', style: GoogleFonts.manrope(fontWeight: FontWeight.bold, color: C.textMute)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: C.rose, foregroundColor: C.onRose),
            child: const Text('YES, CANCEL'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      setState(() => _isCancelling = true);
      try {
        final repo = context.read<OrderRepository>();
        await repo.cancelOrder(widget.orderId);
        await _loadOrderDetail();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Order hold cancelled. Inventory returned.', style: GoogleFonts.jetBrainsMono(color: C.rose)),
              backgroundColor: C.raised,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(e.toString()), backgroundColor: C.rose),
          );
        }
      } finally {
        if (mounted) setState(() => _isCancelling = false);
      }
    }
  }

  void _copyTracking(String trackingId) {
    Clipboard.setData(ClipboardData(text: trackingId));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Tracking ID copied: $trackingId', style: GoogleFonts.jetBrainsMono(color: C.mint)),
        backgroundColor: C.raised,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: C.base,
      appBar: AppBar(
        backgroundColor: C.surface,
        title: Text(
          'Order Timeline',
          style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: C.text),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: C.text),
          onPressed: () => context.pop(),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: C.amber))
          : _errorMessage != null || _order == null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.warning_amber_rounded, color: C.rose, size: 44),
                        const SizedBox(height: 12),
                        Text(
                          'Order Record Unavailable',
                          style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.bold, color: C.text),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _errorMessage ?? 'Order #${widget.orderId} could not be located.',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.manrope(fontSize: 12, color: C.textMute),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => context.pop(),
                          child: const Text('BACK TO ORDERS'),
                        ),
                      ],
                    ),
                  ),
                )
              : _buildContent(_order!),
    );
  }

  Widget _buildContent(OrderModel order) {
    final status = order.status.toUpperCase();
    final isPending = status == 'PENDING';
    final isCancelled = status == 'CANCELLED' || status == 'REFUNDED';
    final idStr = order.id.toString();
    final trackingNumber = 'TRK-${idStr.length > 8 ? idStr.substring(0, 8).toUpperCase() : idStr}-GL';

    final steps = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'];
    final currentStepIndex = steps.indexOf(status);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Header Card
        Container(
          padding: const EdgeInsets.all(16),
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
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: C.text,
                    ),
                  ),
                  StatusPillWidget(status: order.status),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'PLACED ON: ${order.createdAt?.toString() ?? "RECENT"}',
                style: GoogleFonts.jetBrainsMono(fontSize: 10, color: C.textMute),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Fulfillment Milestone Rail
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: C.surface,
            borderRadius: BorderRadius.circular(C.radiusCard),
            border: Border.all(color: C.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'FULFILLMENT STATE MACHINE',
                style: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.bold, color: C.textMute),
              ),
              const SizedBox(height: 16),

              if (isCancelled)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: C.roseSoft,
                    borderRadius: BorderRadius.circular(C.radiusCard),
                    border: Border.all(color: C.rose.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.cancel_outlined, color: C.rose, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Order hold was $status. Stock returned to the open trading pool.',
                          style: GoogleFonts.manrope(fontSize: 12, color: C.rose, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                )
              else
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: steps.asMap().entries.map((entry) {
                    final idx = entry.key;
                    final stepName = entry.value;
                    final isPassed = currentStepIndex > idx;
                    final isCurrent = currentStepIndex == idx;

                    Color nodeBg = C.surface;
                    Color nodeBorder = C.line;
                    Color nodeText = C.textMute;
                    Color labelColor = C.textMute;

                    if (isPassed) {
                      nodeBg = C.mint;
                      nodeBorder = C.mint;
                      nodeText = C.onMint;
                      labelColor = C.mint;
                    } else if (isCurrent) {
                      nodeBg = C.amber;
                      nodeBorder = C.amber;
                      nodeText = C.onAmber;
                      labelColor = C.amber;
                    }

                    return Column(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: nodeBg,
                            shape: BoxShape.circle,
                            border: Border.all(color: nodeBorder, width: 2),
                          ),
                          child: Center(
                            child: isPassed
                                ? const Icon(Icons.check, size: 14, color: C.onMint)
                                : Text(
                                    '${idx + 1}',
                                    style: GoogleFonts.jetBrainsMono(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: nodeText,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          stepName,
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 9,
                            fontWeight: isCurrent ? FontWeight.w800 : FontWeight.w600,
                            color: labelColor,
                          ),
                        ),
                      ],
                    );
                  }).toList(),
                ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Courier Tracking Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: C.surface,
            borderRadius: BorderRadius.circular(C.radiusCard),
            border: Border.all(color: C.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.local_shipping_outlined, color: C.sky, size: 18),
                  const SizedBox(width: 6),
                  Text(
                    'COURIER DISPATCH',
                    style: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.bold, color: C.textMute),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('TRACKING CODE', style: GoogleFonts.jetBrainsMono(fontSize: 9, color: C.textMute)),
                      const SizedBox(height: 2),
                      Text(trackingNumber, style: GoogleFonts.jetBrainsMono(fontSize: 12, fontWeight: FontWeight.bold, color: C.text)),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy, size: 18, color: C.textDim),
                    onPressed: () => _copyTracking(trackingNumber),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Itemized Invoice Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: C.surface,
            borderRadius: BorderRadius.circular(C.radiusCard),
            border: Border.all(color: C.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'ITEMIZED RECEIPT',
                style: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.bold, color: C.textMute),
              ),
              const SizedBox(height: 12),

              ...order.items.map((item) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.productName.isNotEmpty ? item.productName : 'Product Item #${item.productId}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.manrope(fontSize: 13, fontWeight: FontWeight.w600, color: C.text),
                            ),
                            Text(
                              'QTY: ${item.quantity}',
                              style: GoogleFonts.jetBrainsMono(fontSize: 10, color: C.textMute),
                            ),
                          ],
                        ),
                      ),
                      PriceText(amount: item.unitPrice * item.quantity, size: PriceTextSize.sm),
                    ],
                  ),
                );
              }),

              const Divider(color: C.line, height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('TOTAL SETTLED', style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.bold, color: C.text)),
                  PriceText(amount: order.totalAmount, size: PriceTextSize.lg, color: C.text),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Cancel Reservation Action
        if (isPending)
          SizedBox(
            width: double.infinity,
            height: 44,
            child: OutlinedButton(
              onPressed: _isCancelling ? null : _onCancelOrder,
              style: OutlinedButton.styleFrom(
                foregroundColor: C.rose,
                side: const BorderSide(color: C.rose),
              ),
              child: Text(
                _isCancelling ? 'CANCELLING RESERVATION...' : 'CANCEL ORDER RESERVATION',
                style: GoogleFonts.jetBrainsMono(fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        const SizedBox(height: 20),
      ],
    );
  }
}
