import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_app/core/theme/app_theme.dart';
import 'package:mobile_app/core/utils/formatters.dart';
import 'package:mobile_app/data/models/order_model.dart';
import 'package:mobile_app/logic/orders/order_bloc.dart';
import 'package:mobile_app/logic/orders/order_event.dart';
import 'package:mobile_app/logic/orders/order_state.dart';
import 'package:mobile_app/presentation/widgets/countdown_timer_widget.dart';

class CheckoutScreen extends StatefulWidget {
  final OrderModel order;

  const CheckoutScreen({super.key, required this.order});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  String _selectedPaymentMethod = 'card';
  final _addressController = TextEditingController(text: '742 Evergreen Terrace, Sector 4');
  final _cityController = TextEditingController(text: 'San Francisco, CA');

  @override
  void dispose() {
    _addressController.dispose();
    _cityController.dispose();
    super.dispose();
  }

  void _onPay() {
    context.read<OrderBloc>().add(
          PayOrderEvent(
            orderId: widget.order.id,
            paymentMethod: _selectedPaymentMethod,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<OrderBloc, OrderState>(
      listener: (context, state) {
        if (state is PaymentSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('🎉 Payment successful! Flash order confirmed.'),
              backgroundColor: AppColors.success,
            ),
          );
        } else if (state is OrderError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppColors.accentFlash,
            ),
          );
        }
      },
      builder: (context, state) {
        if (state is PaymentSuccess) {
          return _buildSuccessScreen(context);
        }

        final isLoading = state is OrderLoading;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Flash Checkout'),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => context.pop(),
            ),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Reservation Timer Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.accentFlash.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.accentFlash.withOpacity(0.4)),
                  ),
                  child: Column(
                    children: [
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.timer, color: AppColors.accentFlash, size: 20),
                          SizedBox(width: 8),
                          Text(
                            'STOCK TEMPORARILY RESERVED',
                            style: TextStyle(
                              color: AppColors.accentFlash,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      CountdownTimerWidget(
                        targetEndTime: widget.order.expiresAt != null
                            ? DateTime.tryParse(widget.order.expiresAt!) ??
                                DateTime.now().add(const Duration(minutes: 10))
                            : DateTime.now().add(const Duration(minutes: 10)),
                        label: 'RESERVATION EXPIRES',
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Order Items Summary
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Order Summary',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          Text(
                            '#${widget.order.id}',
                            style: const TextStyle(
                              color: AppColors.secondary,
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 20, color: AppColors.border),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              widget.order.productName ?? 'Flash Deal Item',
                              style: const TextStyle(fontSize: 14, color: AppColors.textPrimary),
                            ),
                          ),
                          Text(
                            'x${widget.order.quantity}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total to Pay', style: TextStyle(color: AppColors.textSecondary)),
                          Text(
                            AppFormatters.formatCurrency(widget.order.totalAmount),
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppColors.accentFlash,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Delivery Address
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Delivery Address',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _addressController,
                        decoration: const InputDecoration(labelText: 'Street Address'),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _cityController,
                        decoration: const InputDecoration(labelText: 'City & Postal Code'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Payment Options
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Payment Method',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(height: 12),
                      RadioListTile<String>(
                        title: const Text('Instant Card Payment (Stripe / Mock)'),
                        subtitle: const Text('Zero latency tokenized settlement'),
                        value: 'card',
                        groupValue: _selectedPaymentMethod,
                        activeColor: AppColors.primaryLight,
                        onChanged: (val) => setState(() => _selectedPaymentMethod = val!),
                      ),
                      RadioListTile<String>(
                        title: const Text('Digital Wallet / Express Pay'),
                        subtitle: const Text('Instant authentication'),
                        value: 'wallet',
                        groupValue: _selectedPaymentMethod,
                        activeColor: AppColors.primaryLight,
                        onChanged: (val) => setState(() => _selectedPaymentMethod = val!),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                // Pay Button
                ElevatedButton(
                  onPressed: isLoading ? null : _onPay,
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
                  child: isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Text('Pay ${AppFormatters.formatCurrency(widget.order.totalAmount)} Now'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSuccessScreen(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: const BoxDecoration(
                    color: AppColors.success,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check, color: Colors.white, size: 48),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Order Confirmed!',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                Text(
                  'Order #${widget.order.id} has been processed successfully.',
                  style: const TextStyle(color: AppColors.textSecondary),
                ),
                const SizedBox(height: 36),
                ElevatedButton(
                  onPressed: () => context.go('/orders'),
                  child: const Text('View All Orders'),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () => context.go('/home'),
                  child: const Text('Back to Home', style: TextStyle(color: AppColors.textSecondary)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
