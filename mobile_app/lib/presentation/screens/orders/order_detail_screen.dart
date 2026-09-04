import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/order_model.dart';
import 'package:mobile_app/data/repositories/order_repository.dart';
import 'package:mobile_app/presentation/widgets/app_toast.dart';
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
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final secondaryTextColor = isDark ? C.darkTextDim : const Color(0xFF4B5563);
    final roseColor = isDark ? C.darkRose : C.lightRose;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? C.darkSurface : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(C.radiusModal)),
        title: Text('Cancel order?', style: GoogleFonts.sora(fontSize: 17, fontWeight: FontWeight.w700, color: primaryTextColor)),
        content: Text(
          'Are you sure you want to cancel this order?',
          style: GoogleFonts.manrope(fontSize: 13, color: secondaryTextColor),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Keep order', style: GoogleFonts.manrope(fontWeight: FontWeight.w600, color: secondaryTextColor)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: roseColor,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(C.radiusCard),
              ),
            ),
            child: const Text('Cancel order'),
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
          AppToast.showInfo(context, 'Order cancelled successfully.');
        }
      } catch (e) {
        if (mounted) {
          AppToast.showError(context, e.toString());
        }
      } finally {
        if (mounted) setState(() => _isCancelling = false);
      }
    }
  }

  void _copyTracking(String trackingId) {
    Clipboard.setData(ClipboardData(text: trackingId));
    AppToast.showSuccess(
      context,
      'Tracking code copied: $trackingId',
      duration: const Duration(seconds: 2),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final amberColor = isDark ? C.darkAmber : C.lightAmber;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
        title: Text(
          'Order Details',
          style: GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.w700, color: primaryTextColor),
        ),
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: primaryTextColor),
          onPressed: () => context.pop(),
        ),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: amberColor))
          : _errorMessage != null || _order == null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.warning_amber_rounded, color: isDark ? C.darkRose : C.lightRose, size: 44),
                        const SizedBox(height: 12),
                        Text(
                          'Order not found',
                          style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.bold, color: primaryTextColor),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _errorMessage ?? 'Order #${widget.orderId} could not be located.',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.manrope(fontSize: 12, color: isDark ? C.darkTextMute : const Color(0xFF6B7280)),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => context.pop(),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: amberColor,
                            foregroundColor: isDark ? C.darkOnAmber : Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(C.radiusCard),
                            ),
                          ),
                          child: const Text('Back to orders'),
                        ),
                      ],
                    ),
                  ),
                )
              : _buildContent(_order!),
    );
  }

  Widget _buildContent(OrderModel order) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final secondaryTextColor = isDark ? C.darkTextDim : const Color(0xFF4B5563);
    final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);
    final amberColor = isDark ? C.darkAmber : C.lightAmber;
    final mintColor = isDark ? C.darkMint : C.lightMint;
    final roseColor = isDark ? C.darkRose : C.lightRose;
    final cardBg = isDark ? C.darkSurface : Colors.white;
    final cardBorder = isDark ? C.darkLine : const Color(0xFFE5E7EB);
    final raisedBg = isDark ? C.darkRaised : const Color(0xFFF9FAFB);

    final status = order.status.toUpperCase();
    final isPending = status == 'PENDING';
    final isCancelled = status == 'CANCELLED' || status == 'REFUNDED';
    final idStr = order.id.toString();
    final trackingNumber = 'TRK-${idStr.length > 8 ? idStr.substring(0, 8) : idStr}-US';

    final steps = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'];
    final stepLabels = ['Pending', 'Paid', 'Shipped', 'Delivered'];
    final currentStepIndex = steps.indexOf(status);

    return ListView(
      physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
      padding: const EdgeInsets.all(16),
      children: [
        // Header Card
        Container(
          padding: const EdgeInsets.all(16),
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
                    'Order reference',
                    style: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.w600, color: muteTextColor),
                  ),
                  StatusPillWidget(status: status),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                '#$idStr',
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: primaryTextColor,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Fulfillment Milestone Rail
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(C.radiusCard),
            border: Border.all(color: cardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Order status',
                style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: primaryTextColor),
              ),
              const SizedBox(height: 16),

              if (isCancelled)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: roseColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(C.radiusCard),
                    border: Border.all(color: roseColor.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.cancel_outlined, color: roseColor, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'This order was ${status.toLowerCase()}.',
                          style: GoogleFonts.manrope(fontSize: 12, color: roseColor, fontWeight: FontWeight.w600),
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
                    final stepLabel = stepLabels[idx];
                    final isPassed = currentStepIndex > idx;
                    final isCurrent = currentStepIndex == idx;

                    Color nodeBg = raisedBg;
                    Color nodeBorder = cardBorder;
                    Color nodeText = muteTextColor;
                    Color labelColor = muteTextColor;

                    if (isPassed) {
                      nodeBg = mintColor;
                      nodeBorder = mintColor;
                      nodeText = Colors.white;
                      labelColor = mintColor;
                    } else if (isCurrent) {
                      nodeBg = amberColor;
                      nodeBorder = amberColor;
                      nodeText = isDark ? C.darkOnAmber : Colors.white;
                      labelColor = amberColor;
                    }

                    return Column(
                      children: [
                        Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            color: nodeBg,
                            shape: BoxShape.circle,
                            border: Border.all(color: nodeBorder, width: 1.5),
                          ),
                          child: Center(
                            child: isPassed
                                ? const Icon(Icons.check, size: 14, color: Colors.white)
                                : Text(
                                    '${idx + 1}',
                                    style: GoogleFonts.jetBrainsMono(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: nodeText,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          stepLabel,
                          style: GoogleFonts.manrope(
                            fontSize: 10,
                            fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
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

        // Tracking Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(C.radiusCard),
            border: Border.all(color: cardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.local_shipping_outlined, color: amberColor, size: 18),
                  const SizedBox(width: 6),
                  Text(
                    'Tracking',
                    style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: primaryTextColor),
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
                      Text('Tracking number', style: GoogleFonts.manrope(fontSize: 10, color: muteTextColor)),
                      const SizedBox(height: 2),
                      Text(
                        trackingNumber,
                        style: GoogleFonts.jetBrainsMono(fontSize: 12, fontWeight: FontWeight.bold, color: primaryTextColor),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: Icon(Icons.copy, size: 18, color: secondaryTextColor),
                    onPressed: () => _copyTracking(trackingNumber),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Itemized Receipt Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(C.radiusCard),
            border: Border.all(color: cardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Order summary',
                style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: primaryTextColor),
              ),
              const SizedBox(height: 12),

              ...order.items.map((item) {
                return Padding(
                  key: ValueKey('order_item_${item.id}'),
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.productName.isNotEmpty ? item.productName : 'Item #${item.productId}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.manrope(fontSize: 13, fontWeight: FontWeight.w600, color: primaryTextColor),
                            ),
                            Text(
                              'Qty: ${item.quantity}',
                              style: GoogleFonts.manrope(fontSize: 11, color: muteTextColor),
                            ),
                          ],
                        ),
                      ),
                      PriceText(amount: item.unitPrice * item.quantity, size: PriceTextSize.sm, color: primaryTextColor),
                    ],
                  ),
                );
              }),

              Divider(color: cardBorder, height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Total', style: GoogleFonts.sora(fontSize: 14, fontWeight: FontWeight.w700, color: primaryTextColor)),
                  PriceText(amount: order.totalAmount, size: PriceTextSize.lg, color: primaryTextColor),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Cancel Order Action
        if (isPending)
          SizedBox(
            width: double.infinity,
            height: C.heightButtonPrimary,
            child: OutlinedButton(
              onPressed: _isCancelling ? null : _onCancelOrder,
              style: OutlinedButton.styleFrom(
                foregroundColor: roseColor,
                side: BorderSide(color: roseColor.withValues(alpha: 0.5)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(C.radiusCard),
                ),
              ),
              child: Text(
                _isCancelling ? 'Cancelling order...' : 'Cancel order',
                style: GoogleFonts.manrope(fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ),
          ),
        const SizedBox(height: 20),
      ],
    );
  }
}
