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
  String _selectedCountry = 'United States';

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
    'United States',
    'Canada',
    'United Kingdom',
    'Australia',
    'Germany',
    'France',
    'Japan',
    'Italy',
    'Spain',
    'Pakistan',
    'India',
    'United Arab Emirates',
    'Saudi Arabia',
    'Singapore',
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
      _selectedCountry = addr.country;
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

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final secondaryTextColor = isDark ? C.darkTextDim : const Color(0xFF4B5563);
    final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);
    final amberColor = isDark ? C.darkAmber : C.lightAmber;
    final cardBg = isDark ? C.darkSurface : Colors.white;
    final cardBorder = isDark ? C.darkLine : const Color(0xFFE5E7EB);
    final raisedBg = isDark ? C.darkRaised : const Color(0xFFF9FAFB);

    return BlocListener<CheckoutBloc, CheckoutState>(
      listener: (context, state) {
        if (state is CheckoutSuccess) {
          context.read<CartBloc>().add(ClearCartEvent());
          AppToast.showSuccess(
            context,
            'Order placed successfully: #${state.order.id}',
          );
          context.go('/order-success', extra: state.order);
        } else if (state is CheckoutFailure) {
          AppToast.showError(context, state.message);
        }
      },
      child: Scaffold(
        backgroundColor: theme.scaffoldBackgroundColor,
        appBar: AppBar(
          backgroundColor: theme.scaffoldBackgroundColor,
          elevation: 0,
          title: Text(
            'Checkout',
            style: GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.w700, color: primaryTextColor),
          ),
          leading: IconButton(
            icon: Icon(Icons.arrow_back, color: primaryTextColor),
            onPressed: () => context.pop(),
          ),
        ),
        body: SingleChildScrollView(
          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Pinned Order Hold Notice
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 6),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: amberColor.withValues(alpha: isDark ? 0.12 : 0.08),
                    borderRadius: BorderRadius.circular(C.radiusCard),
                    border: Border.all(color: amberColor.withValues(alpha: 0.25)),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.timer_outlined, color: amberColor, size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Items held for 10:00 to complete your purchase',
                          style: GoogleFonts.manrope(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: isDark ? C.darkText : const Color(0xFF374151),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Form Content
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Saved Addresses Picker
                      if (_savedAddresses.isNotEmpty) ...[
                        Text(
                          'Saved addresses',
                          style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: primaryTextColor),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 86,
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
                                  width: 210,
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: cardBg,
                                    borderRadius: BorderRadius.circular(C.radiusCard),
                                    border: Border.all(color: cardBorder),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        addr.recipientName,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.manrope(fontSize: 12, fontWeight: FontWeight.w700, color: primaryTextColor),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        addr.addressLine1,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: GoogleFonts.manrope(fontSize: 11, color: secondaryTextColor),
                                      ),
                                      Text(
                                        '${addr.city}, ${addr.country}',
                                        style: GoogleFonts.manrope(fontSize: 10, color: muteTextColor),
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

                      // Shipping Details Form
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
                              'Shipping address',
                              style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: primaryTextColor),
                            ),
                            const SizedBox(height: 14),
                            TextFormField(
                              controller: _nameController,
                              style: GoogleFonts.manrope(fontSize: 13, color: primaryTextColor),
                              decoration: const InputDecoration(labelText: 'Full name'),
                              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _phoneController,
                              keyboardType: TextInputType.phone,
                              style: GoogleFonts.manrope(fontSize: 13, color: primaryTextColor),
                              decoration: const InputDecoration(labelText: 'Phone number'),
                              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _addressController,
                              style: GoogleFonts.manrope(fontSize: 13, color: primaryTextColor),
                              decoration: const InputDecoration(labelText: 'Street address'),
                              validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: TextFormField(
                                    controller: _cityController,
                                    style: GoogleFonts.manrope(fontSize: 13, color: primaryTextColor),
                                    decoration: const InputDecoration(labelText: 'City'),
                                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: TextFormField(
                                    controller: _stateController,
                                    style: GoogleFonts.manrope(fontSize: 13, color: primaryTextColor),
                                    decoration: const InputDecoration(labelText: 'State / Region'),
                                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: TextFormField(
                                    controller: _postalController,
                                    style: GoogleFonts.manrope(fontSize: 13, color: primaryTextColor),
                                    decoration: const InputDecoration(labelText: 'Zip / Postal code'),
                                    validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            DropdownButtonFormField<String>(
                              initialValue: _countries.firstWhere(
                                (c) => c.toLowerCase() == _selectedCountry.toLowerCase(),
                                orElse: () => _countries.first,
                              ),
                              decoration: const InputDecoration(labelText: 'Country'),
                              dropdownColor: cardBg,
                              items: _countries
                                  .map((c) => DropdownMenuItem(
                                        value: c,
                                        child: Text(c, style: GoogleFonts.manrope(fontSize: 12, color: primaryTextColor)),
                                      ))
                                  .toList(),
                              onChanged: (v) => setState(() => _selectedCountry = v!),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Payment Method
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
                              'Payment method',
                              style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: primaryTextColor),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: ChoiceChip(
                                    showCheckmark: false,
                                    label: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.credit_card, size: 16),
                                        const SizedBox(width: 6),
                                        Flexible(
                                          child: Text(
                                            'Credit / Debit card',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.w600),
                                          ),
                                        ),
                                      ],
                                    ),
                                    selected: _selectedPaymentMethod == 'card',
                                    selectedColor: amberColor,
                                    backgroundColor: raisedBg,
                                    labelStyle: GoogleFonts.manrope(
                                      color: _selectedPaymentMethod == 'card' ? (isDark ? C.darkOnAmber : Colors.white) : secondaryTextColor,
                                    ),
                                    side: BorderSide(
                                      color: _selectedPaymentMethod == 'card' ? amberColor : cardBorder,
                                    ),
                                    onSelected: (_) => setState(() => _selectedPaymentMethod = 'card'),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: ChoiceChip(
                                    showCheckmark: false,
                                    label: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.payments_outlined, size: 16),
                                        const SizedBox(width: 6),
                                        Flexible(
                                          child: Text(
                                            'Cash on delivery',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.w600),
                                          ),
                                        ),
                                      ],
                                    ),
                                    selected: _selectedPaymentMethod == 'cod',
                                    selectedColor: isDark ? C.darkMint : C.lightMint,
                                    backgroundColor: raisedBg,
                                    labelStyle: GoogleFonts.manrope(
                                      color: _selectedPaymentMethod == 'cod' ? (isDark ? C.darkOnMint : Colors.white) : secondaryTextColor,
                                    ),
                                    side: BorderSide(
                                      color: _selectedPaymentMethod == 'cod' ? (isDark ? C.darkMint : C.lightMint) : cardBorder,
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
                                style: GoogleFonts.jetBrainsMono(fontSize: 13, color: primaryTextColor),
                                decoration: InputDecoration(
                                  labelText: 'Card number',
                                  prefixIcon: Icon(Icons.lock_outline, size: 16, color: isDark ? C.darkMint : C.lightMint),
                                ),
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: TextFormField(
                                      controller: _cardExpiryController,
                                      style: GoogleFonts.jetBrainsMono(fontSize: 13, color: primaryTextColor),
                                      decoration: const InputDecoration(labelText: 'MM / YY'),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: TextFormField(
                                      controller: _cardCvcController,
                                      style: GoogleFonts.jetBrainsMono(fontSize: 13, color: primaryTextColor),
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

                      // Order Summary
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
                              'Order Summary',
                              style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: primaryTextColor),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Subtotal', style: GoogleFonts.manrope(fontSize: 12, color: secondaryTextColor)),
                                PriceText(amount: subtotal, size: PriceTextSize.sm, color: primaryTextColor),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Shipping', style: GoogleFonts.manrope(fontSize: 12, color: secondaryTextColor)),
                                Text(
                                  'Free',
                                  style: GoogleFonts.manrope(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? C.darkMint : C.lightMint,
                                  ),
                                ),
                              ],
                            ),
                            if (discount > 0) ...[
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Discount (${widget.couponCode})',
                                    style: GoogleFonts.manrope(fontSize: 12, color: isDark ? C.darkMint : C.lightMint),
                                  ),
                                  PriceText(amount: discount, size: PriceTextSize.sm, color: isDark ? C.darkMint : C.lightMint),
                                ],
                              ),
                            ],
                            const Divider(height: 20),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text('Total', style: GoogleFonts.sora(fontSize: 14, fontWeight: FontWeight.w700, color: primaryTextColor)),
                                PriceText(amount: total, size: PriceTextSize.xl, color: primaryTextColor),
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
                            height: C.heightButtonPrimary,
                            child: ElevatedButton(
                              onPressed: isProcessing ? null : _onConfirmPayment,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: amberColor,
                                foregroundColor: isDark ? C.darkOnAmber : Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(C.radiusCard),
                                ),
                                elevation: 0,
                              ),
                              child: isProcessing
                                  ? const SizedBox(
                                      height: 18,
                                      width: 18,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                    )
                                  : Text(
                                      'Place order · \$${total.toStringAsFixed(2)}',
                                      style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w700),
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
      ),
    );
  }
}
