import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/cart_model.dart';
import 'package:mobile_app/data/repositories/cart_repository.dart';
import 'package:mobile_app/logic/auth/auth_bloc.dart';
import 'package:mobile_app/logic/auth/auth_event.dart';
import 'package:mobile_app/logic/auth/auth_state.dart';
import 'package:mobile_app/logic/cart/cart_bloc.dart';
import 'package:mobile_app/logic/cart/cart_state.dart';
import 'package:mobile_app/logic/orders/order_bloc.dart';
import 'package:mobile_app/logic/orders/order_state.dart';
import 'package:mobile_app/logic/wishlist/wishlist_bloc.dart';
import 'package:mobile_app/logic/wishlist/wishlist_state.dart';
import 'package:mobile_app/presentation/widgets/status_pill_widget.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  List<ShippingAddressModel> _savedAddresses = [];
  bool _isLoadingAddresses = false;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    setState(() => _isLoadingAddresses = true);
    try {
      final repo = context.read<CartRepository>();
      final list = await repo.getShippingAddresses();
      if (mounted) {
        setState(() {
          _savedAddresses = list;
          _isLoadingAddresses = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingAddresses = false);
    }
  }

  void _showAddAddressDialog() {
    final nameCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    final cityCtrl = TextEditingController();
    final stateCtrl = TextEditingController();
    final postalCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    String selectedCountry = 'UNITED STATES';
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: C.overlay,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(C.radiusModal)),
        side: BorderSide(color: C.line, width: 1),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Add Dispatch Destination',
                      style: GoogleFonts.sora(fontSize: 17, fontWeight: FontWeight.bold, color: C.text),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20, color: C.textMute),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Recipient Full Name'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: phoneCtrl,
                  decoration: const InputDecoration(labelText: 'Phone Number'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: addressCtrl,
                  decoration: const InputDecoration(labelText: 'Street Address'),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: TextField(controller: cityCtrl, decoration: const InputDecoration(labelText: 'City'))),
                    const SizedBox(width: 8),
                    Expanded(child: TextField(controller: stateCtrl, decoration: const InputDecoration(labelText: 'State'))),
                    const SizedBox(width: 8),
                    Expanded(child: TextField(controller: postalCtrl, decoration: const InputDecoration(labelText: 'Zip'))),
                  ],
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: isSaving
                      ? null
                      : () async {
                          if (nameCtrl.text.trim().isEmpty || addressCtrl.text.trim().isEmpty) return;
                          setSheetState(() => isSaving = true);
                          try {
                            final repo = context.read<CartRepository>();
                            final newAddress = ShippingAddressModel(
                              id: '0',
                              recipientName: nameCtrl.text.trim(),
                              addressLine1: addressCtrl.text.trim(),
                              city: cityCtrl.text.trim(),
                              state: stateCtrl.text.trim(),
                              postalCode: postalCtrl.text.trim(),
                              country: selectedCountry,
                              phone: phoneCtrl.text.trim(),
                            );
                            await repo.createShippingAddress(newAddress);
                            if (ctx.mounted) Navigator.pop(ctx);
                            _loadAddresses();
                          } catch (e) {
                            setSheetState(() => isSaving = false);
                          }
                        },
                  child: Text(
                    isSaving ? 'SAVING...' : 'SAVE DISPATCH PROFILE',
                    style: GoogleFonts.manrope(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    final user = authState is Authenticated ? authState.user : null;
    final isVendorOrAdmin = user != null && ['vendor', 'admin', 'manager', 'super_admin'].contains(user.role.toLowerCase());
    final avatarLetter = (user?.fullName != null && user!.fullName!.isNotEmpty) ? user.fullName![0].toUpperCase() : 'U';

    return Scaffold(
      backgroundColor: C.base,
      appBar: AppBar(
        backgroundColor: C.surface,
        title: Text(
          'Trader Account',
          style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: C.text),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: C.text),
          onPressed: () => context.go('/home'),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Profile ID Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: C.surface,
              borderRadius: BorderRadius.circular(C.radiusCard),
              border: Border.all(color: C.line),
            ),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: C.raised,
                    shape: BoxShape.circle,
                    border: Border.all(color: C.amber),
                  ),
                  child: Center(
                    child: Text(
                      avatarLetter,
                      style: GoogleFonts.sora(fontSize: 20, fontWeight: FontWeight.bold, color: C.amber),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.fullName ?? 'Authenticated Trader',
                        style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.bold, color: C.text),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        user?.email ?? 'trader@flashsale.com',
                        style: GoogleFonts.jetBrainsMono(fontSize: 11, color: C.textMute),
                      ),
                      const SizedBox(height: 6),
                      StatusPillWidget(status: (user?.role ?? 'CUSTOMER').toUpperCase()),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Merchant Portal Access (if vendor or admin)
          if (isVendorOrAdmin) ...[
            GestureDetector(
              onTap: () => context.push('/vendor'),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: C.violetSoft,
                  borderRadius: BorderRadius.circular(C.radiusCard),
                  border: Border.all(color: C.violet.withOpacity(0.4)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.storefront, color: C.violet, size: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Merchant Control Floor',
                            style: GoogleFonts.sora(fontSize: 14, fontWeight: FontWeight.bold, color: C.text),
                          ),
                          Text(
                            'Manage SKU lots, sub-orders, and Shopify inventory sync',
                            style: GoogleFonts.manrope(fontSize: 11, color: C.textDim),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right, color: C.violet),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Metrics Snapshot Strip
          Row(
            children: [
              Expanded(
                child: BlocBuilder<CartBloc, CartState>(
                  builder: (context, state) {
                    final count = state is CartLoaded ? state.cart.itemCount : 0;
                    return _buildMetricTile('CART HOLDS', '$count', Icons.shopping_bag_outlined, () => context.push('/cart'));
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: BlocBuilder<WishlistBloc, WishlistState>(
                  builder: (context, state) {
                    final count = state is WishlistLoaded ? state.items.length : 0;
                    return _buildMetricTile('SAVED VAULT', '$count', Icons.favorite_border, () => context.push('/wishlist'));
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: BlocBuilder<OrderBloc, OrderState>(
                  builder: (context, state) {
                    final count = state is OrdersLoaded ? state.orders.length : 0;
                    return _buildMetricTile('ORDERS', '$count', Icons.receipt_long_outlined, () => context.push('/orders'));
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Shipping Addresses Section
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
                      'SAVED DISPATCH DESTINATIONS',
                      style: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.bold, color: C.textMute),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add, size: 18, color: C.amber),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: _showAddAddressDialog,
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                if (_isLoadingAddresses)
                  const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(color: C.amber)))
                else if (_savedAddresses.isEmpty)
                  Text('No shipping addresses registered.', style: GoogleFonts.manrope(fontSize: 12, color: C.textMute))
                else
                  ..._savedAddresses.map((addr) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: C.raised,
                            borderRadius: BorderRadius.circular(C.radiusCard),
                            border: Border.all(color: C.line),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.location_on_outlined, size: 16, color: C.amber),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(addr.recipientName, style: GoogleFonts.manrope(fontSize: 12, fontWeight: FontWeight.bold, color: C.text)),
                                    Text('${addr.addressLine1}, ${addr.city} (${addr.country})', style: GoogleFonts.manrope(fontSize: 11, color: C.textDim)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      )),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Logout Action
          OutlinedButton.icon(
            onPressed: () {
              context.read<AuthBloc>().add(LogoutEvent());
              context.go('/login');
            },
            icon: const Icon(Icons.logout, size: 16, color: C.rose),
            label: Text('TERMINATE SESSION', style: GoogleFonts.jetBrainsMono(fontSize: 11, fontWeight: FontWeight.bold, color: C.rose)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: C.rose),
              minimumSize: const Size.fromHeight(48),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildMetricTile(String label, String value, IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        decoration: BoxDecoration(
          color: C.surface,
          borderRadius: BorderRadius.circular(C.radiusCard),
          border: Border.all(color: C.line),
        ),
        child: Column(
          children: [
            Icon(icon, size: 20, color: C.amber),
            const SizedBox(height: 6),
            Text(
              value,
              style: GoogleFonts.jetBrainsMono(fontSize: 16, fontWeight: FontWeight.bold, color: C.text),
            ),
            Text(
              label,
              style: GoogleFonts.jetBrainsMono(fontSize: 8, fontWeight: FontWeight.bold, color: C.textMute),
            ),
          ],
        ),
      ),
    );
  }
}
