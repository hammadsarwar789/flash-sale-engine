import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/theme_controller.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/logic/cart/cart_bloc.dart';
import 'package:mobile_app/logic/cart/cart_state.dart';
import 'package:mobile_app/logic/wishlist/wishlist_bloc.dart';
import 'package:mobile_app/logic/wishlist/wishlist_state.dart';

class MainLayoutScreen extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const MainLayoutScreen({
    super.key,
    required this.navigationShell,
  });

  void _onTap(BuildContext context, int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: ThemeController.instance,
      builder: (context, _) {
        final theme = Theme.of(context);
        final isDark = ThemeController.instance.isDark;

        final navBg = isDark ? C.darkSurface : Colors.white;
        final navBorder = isDark ? C.darkLine : const Color(0xFFE5E7EB);
        final amberColor = isDark ? C.darkAmber : C.lightAmber;
        final onAmberColor = isDark ? C.darkOnAmber : Colors.white;
        final unselectedColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);

        return Scaffold(
          backgroundColor: theme.scaffoldBackgroundColor,
          body: navigationShell,
          bottomNavigationBar: Container(
            decoration: BoxDecoration(
              color: navBg,
              border: Border(top: BorderSide(color: navBorder, width: 1)),
            ),
            child: BlocBuilder<CartBloc, CartState>(
              builder: (context, cartState) {
                final cartCount = cartState is CartLoaded ? cartState.cart.itemCount : 0;
                return BlocBuilder<WishlistBloc, WishlistState>(
                  builder: (context, wishlistState) {
                    final wishlistCount = wishlistState is WishlistLoaded ? wishlistState.items.length : 0;

                    return Theme(
                      data: theme.copyWith(
                        canvasColor: navBg,
                        splashColor: Colors.transparent,
                        highlightColor: Colors.transparent,
                      ),
                      child: BottomNavigationBar(
                        type: BottomNavigationBarType.fixed,
                        backgroundColor: navBg,
                        elevation: 0,
                        currentIndex: navigationShell.currentIndex,
                        selectedItemColor: amberColor,
                        unselectedItemColor: unselectedColor,
                  selectedFontSize: 10,
                  unselectedFontSize: 10,
                  selectedLabelStyle: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.w800),
                  unselectedLabelStyle: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.w600),
                  onTap: (index) => _onTap(context, index),
                  items: [
                    const BottomNavigationBarItem(
                      icon: Icon(Icons.bolt, size: 20),
                      label: 'Floor',
                    ),
                    BottomNavigationBarItem(
                      icon: Badge(
                        isLabelVisible: wishlistCount > 0,
                        label: Text('$wishlistCount', style: GoogleFonts.jetBrainsMono(fontSize: 9, color: onAmberColor, fontWeight: FontWeight.bold)),
                        backgroundColor: amberColor,
                        child: const Icon(Icons.favorite_border, size: 20),
                      ),
                      activeIcon: Badge(
                        isLabelVisible: wishlistCount > 0,
                        label: Text('$wishlistCount', style: GoogleFonts.jetBrainsMono(fontSize: 9, color: onAmberColor, fontWeight: FontWeight.bold)),
                        backgroundColor: amberColor,
                        child: const Icon(Icons.favorite, size: 20),
                      ),
                      label: 'Saved',
                    ),
                    BottomNavigationBarItem(
                      icon: Badge(
                        isLabelVisible: cartCount > 0,
                        label: Text('$cartCount', style: GoogleFonts.jetBrainsMono(fontSize: 9, color: onAmberColor, fontWeight: FontWeight.bold)),
                        backgroundColor: amberColor,
                        child: const Icon(Icons.shopping_bag_outlined, size: 20),
                      ),
                      activeIcon: Badge(
                        isLabelVisible: cartCount > 0,
                        label: Text('$cartCount', style: GoogleFonts.jetBrainsMono(fontSize: 9, color: onAmberColor, fontWeight: FontWeight.bold)),
                        backgroundColor: amberColor,
                        child: const Icon(Icons.shopping_bag, size: 20),
                      ),
                      label: 'Vault',
                    ),
                    const BottomNavigationBarItem(
                      icon: Icon(Icons.receipt_long_outlined, size: 20),
                      activeIcon: Icon(Icons.receipt_long, size: 20),
                      label: 'Orders',
                    ),
                    const BottomNavigationBarItem(
                      icon: Icon(Icons.person_outline, size: 20),
                      activeIcon: Icon(Icons.person, size: 20),
                      label: 'Account',
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    ),
  );
},
);
}
}
