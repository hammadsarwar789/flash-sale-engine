import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/theme_controller.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/cart_model.dart';
import 'package:mobile_app/data/repositories/cart_repository.dart';
import 'package:mobile_app/logic/auth/auth_bloc.dart';
import 'package:mobile_app/logic/auth/auth_event.dart';
import 'package:mobile_app/logic/auth/auth_state.dart';
import 'package:mobile_app/logic/cart/cart_bloc.dart';
import 'package:mobile_app/logic/cart/cart_event.dart';
import 'package:mobile_app/logic/cart/cart_state.dart';
import 'package:mobile_app/logic/orders/order_bloc.dart';
import 'package:mobile_app/logic/orders/order_state.dart';
import 'package:mobile_app/logic/wishlist/wishlist_bloc.dart';
import 'package:mobile_app/logic/wishlist/wishlist_event.dart';
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

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final amberColor = isDark ? C.darkAmber : C.lightAmber;
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final secondaryTextColor = isDark ? C.darkTextDim : const Color(0xFF4B5563);
    final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
        title: Text(
          'ACCOUNT',
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
      body: authState is! Authenticated
          ? _buildUnauthenticatedView(isDark, primaryTextColor, muteTextColor, amberColor)
          : ListView(
        physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
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
                  border: Border.all(color: C.violet.withValues(alpha: 0.4)),
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
                    return _buildMetricTile('CART HOLDS', '$count', Icons.shopping_bag_outlined, () => context.go('/cart'));
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: BlocBuilder<WishlistBloc, WishlistState>(
                  builder: (context, state) {
                    final count = state is WishlistLoaded ? state.items.length : 0;
                    return _buildMetricTile('SAVED VAULT', '$count', Icons.favorite_border, () => context.go('/wishlist'));
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: BlocBuilder<OrderBloc, OrderState>(
                  builder: (context, state) {
                    final count = state is OrdersLoaded ? state.orders.length : 0;
                    return _buildMetricTile('ORDERS', '$count', Icons.receipt_long_outlined, () => context.go('/orders'));
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
                        key: ValueKey('profile_addr_${addr.id}'),
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

          // Visual Theme Mode Selector
          AnimatedBuilder(
            animation: ThemeController.instance,
            builder: (context, _) {
              final isDark = ThemeController.instance.isDark;
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: C.surface,
                  borderRadius: BorderRadius.circular(C.radiusCard),
                  border: Border.all(color: C.line),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: C.raised,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                        size: 20,
                        color: isDark ? C.amber : C.textDim,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Visual Theme',
                            style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.bold, color: C.text),
                          ),
                          Text(
                            isDark ? 'Night Trading Floor (Obsidian Dark)' : 'Day Trading Floor (Warm Paper Light)',
                            style: GoogleFonts.manrope(fontSize: 11, color: C.textMute),
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: isDark,
                      activeThumbColor: C.amber,
                      onChanged: (val) {
                        HapticFeedback.lightImpact();
                        ThemeController.instance.setThemeMode(val ? ThemeMode.dark : ThemeMode.light);
                      },
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 16),

          // Logout Action
          OutlinedButton.icon(
            onPressed: () {
              context.read<AuthBloc>().add(LogoutEvent());
              context.read<CartBloc>().add(LoadCartEvent());
              context.read<WishlistBloc>().add(LoadWishlistEvent());
              context.go('/login');
            },
            icon: const Icon(Icons.logout, size: 16, color: C.rose),
            label: Text('TERMINATE SESSION', style: GoogleFonts.jetBrainsMono(fontSize: 11, fontWeight: FontWeight.bold, color: C.rose)),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: C.rose),
              minimumSize: const Size(0, 48),
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
                child: Icon(Icons.person_outline, size: 36, color: amberColor),
              ),
              const SizedBox(height: 16),
              Text(
                'Account Authentication Required',
                textAlign: TextAlign.center,
                style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.bold, color: primaryTextColor),
              ),
              const SizedBox(height: 8),
              Text(
                'Please sign in to view your profile credentials, manage dispatch addresses, and access merchant controls.',
                textAlign: TextAlign.center,
                style: GoogleFonts.manrope(fontSize: 12, color: muteTextColor),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () => context.push('/login', extra: {'returnTo': '/profile'}),
                style: ElevatedButton.styleFrom(
                  backgroundColor: amberColor,
                  foregroundColor: isDark ? C.darkOnAmber : Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                ),
                child: const Text('SIGN IN TO ACCOUNT'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
