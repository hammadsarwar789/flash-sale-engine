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
import 'package:mobile_app/presentation/widgets/empty_state_widget.dart';
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
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final amberColor = isDark ? C.darkAmber : C.lightAmber;
    final cardBg = isDark ? C.darkSurface : Colors.white;
    final cardBorder = isDark ? C.darkLine : const Color(0xFFE5E7EB);
    final inputBg = isDark ? C.darkRaised : const Color(0xFFF9FAFB);

    final nameCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    final cityCtrl = TextEditingController();
    final stateCtrl = TextEditingController();
    final postalCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    String selectedCountry = 'United States';
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(C.radiusModal)),
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
                      'Add Shipping Address',
                      style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: primaryTextColor),
                    ),
                    IconButton(
                      icon: Icon(Icons.close, size: 20, color: isDark ? C.darkTextMute : const Color(0xFF9CA3AF)),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _buildModalTextField(nameCtrl, 'Full name', inputBg, cardBorder, primaryTextColor),
                const SizedBox(height: 10),
                _buildModalTextField(phoneCtrl, 'Phone number', inputBg, cardBorder, primaryTextColor, keyboardType: TextInputType.phone),
                const SizedBox(height: 10),
                _buildModalTextField(addressCtrl, 'Street address', inputBg, cardBorder, primaryTextColor),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(child: _buildModalTextField(cityCtrl, 'City', inputBg, cardBorder, primaryTextColor)),
                    const SizedBox(width: 8),
                    Expanded(child: _buildModalTextField(stateCtrl, 'State', inputBg, cardBorder, primaryTextColor)),
                    const SizedBox(width: 8),
                    Expanded(child: _buildModalTextField(postalCtrl, 'Zip code', inputBg, cardBorder, primaryTextColor)),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  height: C.heightButtonPrimary,
                  child: ElevatedButton(
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
                    style: ElevatedButton.styleFrom(
                      backgroundColor: amberColor,
                      foregroundColor: isDark ? C.darkOnAmber : Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(C.radiusCard),
                      ),
                    ),
                    child: isSaving
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Text(
                            'Save address',
                            style: GoogleFonts.manrope(fontWeight: FontWeight.w700, fontSize: 13),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildModalTextField(
    TextEditingController ctrl,
    String hint,
    Color bg,
    Color border,
    Color textColor, {
    TextInputType keyboardType = TextInputType.text,
  }) {
    return TextField(
      controller: ctrl,
      keyboardType: keyboardType,
      style: GoogleFonts.manrope(fontSize: 13, color: textColor),
      decoration: InputDecoration(
        labelText: hint,
        labelStyle: GoogleFonts.manrope(fontSize: 12),
        filled: true,
        fillColor: bg,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(C.radiusCard),
          borderSide: BorderSide(color: border),
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
    final cardBg = isDark ? C.darkSurface : Colors.white;
    final cardBorder = isDark ? C.darkLine : const Color(0xFFE5E7EB);
    final raisedBg = isDark ? C.darkRaised : const Color(0xFFF9FAFB);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
        title: Text(
          'Account',
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
      body: authState is! Authenticated
          ? EmptyStateWidget.unauthenticated(
              context,
              title: 'Sign in to your account',
              message: 'View your profile, manage shipping addresses, and check order history.',
              onSignIn: () => context.push('/login', extra: {'returnTo': '/profile'}),
            )
          : ListView(
              physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
              padding: const EdgeInsets.all(16),
              children: [
                // Profile ID Card
                Container(
                  padding: const EdgeInsets.all(16),
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
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: raisedBg,
                          shape: BoxShape.circle,
                          border: Border.all(color: amberColor),
                        ),
                        child: Center(
                          child: Text(
                            avatarLetter,
                            style: GoogleFonts.sora(fontSize: 18, fontWeight: FontWeight.bold, color: amberColor),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user?.fullName ?? 'Valued Customer',
                              style: GoogleFonts.sora(fontSize: 15, fontWeight: FontWeight.w700, color: primaryTextColor),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              user?.email ?? '',
                              style: GoogleFonts.manrope(fontSize: 12, color: muteTextColor),
                            ),
                            const SizedBox(height: 6),
                            StatusPillWidget(status: user?.role ?? 'Customer'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Seller Dashboard Access (if vendor or admin)
                if (isVendorOrAdmin) ...[
                  GestureDetector(
                    onTap: () => context.push('/vendor'),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isDark ? C.violetSoft : const Color(0xFFF5F3FF),
                        borderRadius: BorderRadius.circular(C.radiusCard),
                        border: Border.all(color: C.violet.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.storefront, color: C.violet, size: 22),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Seller Dashboard',
                                  style: GoogleFonts.sora(fontSize: 14, fontWeight: FontWeight.w700, color: primaryTextColor),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Manage products, inventory, and customer orders',
                                  style: GoogleFonts.manrope(fontSize: 11, color: secondaryTextColor),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right, color: C.violet),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                // Metrics Snapshot Strip
                Row(
                  children: [
                    Expanded(
                      child: BlocBuilder<CartBloc, CartState>(
                        builder: (context, state) {
                          final count = state is CartLoaded ? state.cart.itemCount : 0;
                          return _buildMetricTile(
                            'Cart',
                            '$count',
                            Icons.shopping_bag_outlined,
                            cardBg,
                            cardBorder,
                            amberColor,
                            primaryTextColor,
                            muteTextColor,
                            () => context.go('/cart'),
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: BlocBuilder<WishlistBloc, WishlistState>(
                        builder: (context, state) {
                          final count = state is WishlistLoaded ? state.items.length : 0;
                          return _buildMetricTile(
                            'Saved',
                            '$count',
                            Icons.favorite_border,
                            cardBg,
                            cardBorder,
                            amberColor,
                            primaryTextColor,
                            muteTextColor,
                            () => context.go('/wishlist'),
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: BlocBuilder<OrderBloc, OrderState>(
                        builder: (context, state) {
                          final count = state is OrdersLoaded ? state.orders.length : 0;
                          return _buildMetricTile(
                            'Orders',
                            '$count',
                            Icons.receipt_long_outlined,
                            cardBg,
                            cardBorder,
                            amberColor,
                            primaryTextColor,
                            muteTextColor,
                            () => context.go('/orders'),
                          );
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Shipping Addresses Section
                Container(
                  padding: const EdgeInsets.all(16),
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
                            'Saved Addresses',
                            style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: primaryTextColor),
                          ),
                          IconButton(
                            icon: Icon(Icons.add, size: 20, color: amberColor),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            onPressed: _showAddAddressDialog,
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      if (_isLoadingAddresses)
                        Center(child: Padding(padding: const EdgeInsets.all(12), child: CircularProgressIndicator(color: amberColor)))
                      else if (_savedAddresses.isEmpty)
                        Text(
                          'No shipping addresses saved yet.',
                          style: GoogleFonts.manrope(fontSize: 12, color: muteTextColor),
                        )
                      else
                        ..._savedAddresses.map((addr) => Padding(
                              key: ValueKey('profile_addr_${addr.id}'),
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: raisedBg,
                                  borderRadius: BorderRadius.circular(C.radiusCard),
                                  border: Border.all(color: cardBorder),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.location_on_outlined, size: 16, color: amberColor),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            addr.recipientName,
                                            style: GoogleFonts.manrope(fontSize: 12, fontWeight: FontWeight.w700, color: primaryTextColor),
                                          ),
                                          Text(
                                            '${addr.addressLine1}, ${addr.city} (${addr.country})',
                                            style: GoogleFonts.manrope(fontSize: 11, color: secondaryTextColor),
                                          ),
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
                const SizedBox(height: 14),

                // Visual Theme Mode Selector
                AnimatedBuilder(
                  animation: ThemeController.instance,
                  builder: (context, _) {
                    final isDarkTheme = ThemeController.instance.isDark;
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(C.radiusCard),
                        border: Border.all(color: cardBorder),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: raisedBg,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              isDarkTheme ? Icons.dark_mode_outlined : Icons.light_mode_outlined,
                              size: 18,
                              color: amberColor,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Dark mode',
                                  style: GoogleFonts.sora(fontSize: 13, fontWeight: FontWeight.w700, color: primaryTextColor),
                                ),
                                Text(
                                  isDarkTheme ? 'Currently using dark mode' : 'Currently using light mode',
                                  style: GoogleFonts.manrope(fontSize: 11, color: muteTextColor),
                                ),
                              ],
                            ),
                          ),
                          Switch(
                            value: isDarkTheme,
                            activeThumbColor: amberColor,
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

                // Sign Out Action
                SizedBox(
                  height: C.heightButtonPrimary,
                  child: OutlinedButton.icon(
                    onPressed: () {
                      context.read<AuthBloc>().add(LogoutEvent());
                      context.read<CartBloc>().add(LoadCartEvent());
                      context.read<WishlistBloc>().add(LoadWishlistEvent());
                      context.go('/login');
                    },
                    icon: Icon(Icons.logout, size: 16, color: isDark ? C.darkRose : C.lightRose),
                    label: Text(
                      'Sign out',
                      style: GoogleFonts.manrope(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: isDark ? C.darkRose : C.lightRose,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: (isDark ? C.darkRose : C.lightRose).withValues(alpha: 0.5)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(C.radiusCard),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
    );
  }

  Widget _buildMetricTile(
    String label,
    String value,
    IconData icon,
    Color cardBg,
    Color cardBorder,
    Color amberColor,
    Color primaryTextColor,
    Color muteTextColor,
    VoidCallback onTap,
  ) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(C.radiusCard),
          border: Border.all(color: cardBorder),
        ),
        child: Column(
          children: [
            Icon(icon, size: 18, color: amberColor),
            const SizedBox(height: 4),
            Text(
              value,
              style: GoogleFonts.jetBrainsMono(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: primaryTextColor,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: GoogleFonts.manrope(fontSize: 10, fontWeight: FontWeight.w600, color: muteTextColor),
            ),
          ],
        ),
      ),
    );
  }
}
