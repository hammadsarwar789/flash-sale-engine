import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/cart_model.dart';
import 'package:mobile_app/data/models/order_model.dart';
import 'package:mobile_app/data/repositories/cart_repository.dart';
import 'package:mobile_app/logic/checkout/checkout_bloc.dart';
import 'package:mobile_app/logic/checkout/checkout_event.dart';
import 'package:mobile_app/logic/checkout/checkout_state.dart';
import 'package:mobile_app/logic/cart/cart_bloc.dart';
import 'package:mobile_app/logic/cart/cart_event.dart';
import 'package:mobile_app/presentation/widgets/app_toast.dart';
import 'package:mobile_app/presentation/widgets/price_text.dart';

class CheckoutScreen extends StatefulWidget {
  final OrderModel order;
  final String? couponCode;
  final double discount;

  const CheckoutScreen({
    super.key,
    required this.order,
    this.couponCode,
    this.discount = 0.0,
  });

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  String _selectedPaymentMethod = 'card';
  String _selectedCountry = 'UNITED STATES';

  final _nameController = TextEditingController(text: 'Customer Trader');
  final _addressController = TextEditingController(text: '100 Wall Street, Suite 400');
  final _cityController = TextEditingController(text: 'New York');
  final _stateController = TextEditingController(text: 'NY');
  final _postalController = TextEditingController(text: '10005');
  final _phoneController = TextEditingController(text: '+1 (555) 019-2834');

  // Card fields
  final _cardNumberController = TextEditingController(text: '4242 •••• •••• 4242');
  final _cardExpiryController = TextEditingController(text: '12/28');
  final _cardCvcController = TextEditingController(text: '888');

  List<ShippingAddressModel> _savedAddresses = [];

  final List<String> _countries = [
    'UNITED STATES',
    'CANADA',
    'UNITED KINGDOM',
    'AUSTRALIA',
    'GERMANY',
    'FRANCE',
    'JAPAN',
    'ITALY',
    'SPAIN',
    'PAKISTAN',
    'INDIA',
    'UNITED ARAB EMIRATES',
    'SAUDI ARABIA',
    'SINGAPORE',
  ];

  @override
  void initState() {
    super.initState();
    _fetchSavedAddresses();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _postalController.dispose();
    _phoneController.dispose();
    _cardNumberController.dispose();
    _cardExpiryController.dispose();
    _cardCvcController.dispose();
    super.dispose();
  }

  Future<void> _fetchSavedAddresses() async {
    try {
      final repo = context.read<CartRepository>();
      final addresses = await repo.getShippingAddresses();
      if (mounted) {
        setState(() {
          _savedAddresses = addresses;
        });
      }
    } catch (_) {}
  }

  void _onSelectSavedAddress(ShippingAddressModel addr) {
    setState(() {
      _nameController.text = addr.recipientName;
      _addressController.text = addr.addressLine1;
      _cityController.text = addr.city;
      _stateController.text = addr.state;
      _postalController.text = addr.postalCode;
      _selectedCountry = addr.country.toUpperCase();
      if (addr.phone.isNotEmpty) _phoneController.text = addr.phone;
    });
  }

  void _onConfirmPayment() {
    if (!_formKey.currentState!.validate()) return;

    final shippingAddress = {
      'recipient_name': _nameController.text.trim(),
      'address_line1': _addressController.text.trim(),
      'city': _cityController.text.trim(),
      'state': _stateController.text.trim(),
      'postal_code': _postalController.text.trim(),
      'country': _selectedCountry,
      'phone': _phoneController.text.trim(),
    };

    final items = widget.order.items.map((i) => {
      'product_id': i.productId,
      'quantity': i.quantity,
      'unit_price': i.unitPrice,
    }).toList();

    context.read<CheckoutBloc>().add(
          ProceedToSettlementEvent(
            couponCode: widget.couponCode,
            shippingAddress: shippingAddress,
            paymentMethod: _selectedPaymentMethod,
            items: items,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    final subtotal = widget.order.totalAmount;
    final discount = widget.discount;
    final total = (subtotal - discount).clamp(0.0, double.infinity);

    return BlocListener<CheckoutBloc, CheckoutState>(
      listener: (context, state) {
        if (state is CheckoutSuccess) {
          context.read<CartBloc>().add(ClearCartEvent());
          AppToast.showSuccess(
            context,
            'PAYMENT SETTLED: Order #${state.order.id}',
          );
          context.go('/order-success', extra: state.order);
        } else if (state is CheckoutFailure) {
          AppToast.showError(context, state.message);
        }
      },
      child: Scaffold(
        backgroundColor: C.base,
        appBar: AppBar(
          backgroundColor: C.surface,
          title: Text(
            'Order Settlement',
            style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: C.text),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: C.text),
            onPressed: () => context.pop(),
          ),
        ),
        body: Column(
          children: [
            // Pinned Order Hold Notice
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: C.amberSoft,
                  borderRadius: BorderRadius.circular(C.radiusCard),
                  border: Border.all(color: C.amber.withValues(alpha: 0.4)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.lock_outline, color: C.amber, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '10:00 MIN RESERVATION HOLD ACTIVE FOR ORDER #${widget.order.id}',
                        style: GoogleFonts.jetBrainsMono(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: C.amber,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Scrollable Form Content
            Expanded(
              child: Form(
                key: _formKey,
                child: ListView(
                  physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  children: [
                    // Step 1: Saved Addresses Picker
                    if (_savedAddresses.isNotEmpty) ...[
                      Text(
                        '1 · SAVED DISPATCH PROFILES',
                        style: GoogleFonts.jetBrainsMono(fontSize: 11, fontWeight: FontWeight.bold, color: C.textMute),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        height: 90,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                          itemCount: _savedAddresses.length,
                          separatorBuilder: (_, _) => const SizedBox(width: 8),
                          itemBuilder: (context, i) {
                            final addr = _savedAddresses[i];
                            return GestureDetector(
                              key: ValueKey('addr_${addr.id}'),
                              onTap: () => _onSelectSavedAddress(addr),
                              child: Container(
                                width: 200,
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: C.surface,
                                  borderRadius: BorderRadius.circular(C.radiusCard),
                                  border: Border.all(color: C.line),
                                ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                addr.recipientName,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.manrope(fontSize: 12, fontWeight: FontWeight.bold, color: C.text),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                addr.addressLine1,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.manrope(fontSize: 11, color: C.textDim),
                              ),
                              Text(
                                '${addr.city}, ${addr.country}',
                                style: GoogleFonts.manrope(fontSize: 10, color: C.textMute),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Step 2: Shipping Details Form
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
                      '2 · SHIPPING DESTINATION',
                      style: GoogleFonts.jetBrainsMono(fontSize: 11, fontWeight: FontWeight.bold, color: C.textMute),
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _nameController,
                      decoration: const InputDecoration(labelText: 'Full Name'),
                      validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _phoneController,
                      decoration: const InputDecoration(labelText: 'Phone Number'),
                      validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _addressController,
                      decoration: const InputDecoration(labelText: 'Street Address'),
                      validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _cityController,
                            decoration: const InputDecoration(labelText: 'City'),
                            validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextFormField(
                            controller: _stateController,
                            decoration: const InputDecoration(labelText: 'State / Region'),
                            validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextFormField(
                            controller: _postalController,
                            decoration: const InputDecoration(labelText: 'Postal Code'),
                            validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _countries.contains(_selectedCountry) ? _selectedCountry : _countries.first,
                      decoration: const InputDecoration(labelText: 'Country'),
                      dropdownColor: C.raised,
                      items: _countries
                          .map((c) => DropdownMenuItem(
                                value: c,
                                child: Text(c, style: GoogleFonts.jetBrainsMono(fontSize: 12, color: C.text)),
                              ))
                          .toList(),
                      onChanged: (v) => setState(() => _selectedCountry = v!),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Step 3: Payment Method
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
                      '3 · PAYMENT SETTLEMENT',
                      style: GoogleFonts.jetBrainsMono(fontSize: 11, fontWeight: FontWeight.bold, color: C.textMute),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: ChoiceChip(
                            label: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.credit_card, size: 16),
                                const SizedBox(width: 6),
                                Text(
                                  'CREDIT / DEBIT',
                                  style: GoogleFonts.jetBrainsMono(fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            selected: _selectedPaymentMethod == 'card',
                            selectedColor: C.amber,
                            backgroundColor: C.raised,
                            labelStyle: GoogleFonts.jetBrainsMono(
                              color: _selectedPaymentMethod == 'card' ? C.onAmber : C.textDim,
                            ),
                            side: BorderSide(
                              color: _selectedPaymentMethod == 'card' ? C.amber : C.line,
                            ),
                            onSelected: (_) => setState(() => _selectedPaymentMethod = 'card'),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ChoiceChip(
                            label: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.payments_outlined, size: 16),
                                const SizedBox(width: 6),
                                Text(
                                  'CASH ON DELIVERY',
                                  style: GoogleFonts.jetBrainsMono(fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            selected: _selectedPaymentMethod == 'cod',
                            selectedColor: C.mint,
                            backgroundColor: C.raised,
                            labelStyle: GoogleFonts.jetBrainsMono(
                              color: _selectedPaymentMethod == 'cod' ? C.onMint : C.textDim,
                            ),
                            side: BorderSide(
                              color: _selectedPaymentMethod == 'cod' ? C.mint : C.line,
                            ),
                            onSelected: (_) => setState(() => _selectedPaymentMethod = 'cod'),
                          ),
                        ),
                      ],
                    ),
                    if (_selectedPaymentMethod == 'card') ...[
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _cardNumberController,
                        style: GoogleFonts.jetBrainsMono(fontSize: 13),
                        decoration: const InputDecoration(
                          labelText: 'Card Number',
                          prefixIcon: Icon(Icons.lock_outline, size: 16, color: C.mint),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _cardExpiryController,
                              style: GoogleFonts.jetBrainsMono(fontSize: 13),
                              decoration: const InputDecoration(labelText: 'MM / YY'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _cardCvcController,
                              style: GoogleFonts.jetBrainsMono(fontSize: 13),
                              decoration: const InputDecoration(labelText: 'CVC / CVV'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Invoice Total Spec
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: C.surface,
                  borderRadius: BorderRadius.circular(C.radiusCard),
                  border: Border.all(color: C.line),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('SUBTOTAL', style: GoogleFonts.jetBrainsMono(fontSize: 11, color: C.textDim)),
                        PriceText(amount: subtotal, size: PriceTextSize.sm),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('COURIER SHIPPING', style: GoogleFonts.jetBrainsMono(fontSize: 11, color: C.textDim)),
                        Text('FREE INCLUDED', style: GoogleFonts.jetBrainsMono(fontSize: 11, fontWeight: FontWeight.bold, color: C.mint)),
                      ],
                    ),
                    if (discount > 0) ...[
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('PROMO (${widget.couponCode})', style: GoogleFonts.jetBrainsMono(fontSize: 11, color: C.mint)),
                          PriceText(amount: discount, size: PriceTextSize.sm, color: C.mint),
                        ],
                      ),
                    ],
                    const Divider(color: C.line, height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('TOTAL CHARGED', style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.bold, color: C.text)),
                        PriceText(amount: total, size: PriceTextSize.xl, color: C.text),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Confirm Button
              BlocBuilder<CheckoutBloc, CheckoutState>(
                builder: (context, state) {
                  final isProcessing = state is CheckoutLoading;
                  return SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: isProcessing ? null : _onConfirmPayment,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: C.amber,
                        foregroundColor: C.onAmber,
                      ),
                      child: isProcessing
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: C.onAmber),
                            )
                          : Text(
                              _selectedPaymentMethod == 'cod'
                                  ? 'CONFIRM CASH ON DELIVERY — \$${total.toStringAsFixed(2)}'
                                  : 'AUTHORIZE PAYMENT — \$${total.toStringAsFixed(2)}',
                              style: GoogleFonts.manrope(fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    ],
  ),
),
);
  }
}
