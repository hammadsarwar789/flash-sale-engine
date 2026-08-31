import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/logic/auth/auth_bloc.dart';
import 'package:mobile_app/logic/auth/auth_state.dart';
import 'package:mobile_app/logic/cart/cart_bloc.dart';
import 'package:mobile_app/logic/cart/cart_event.dart';
import 'package:mobile_app/logic/cart/cart_state.dart';
import 'package:mobile_app/logic/products/product_bloc.dart';
import 'package:mobile_app/logic/products/product_event.dart';
import 'package:mobile_app/logic/products/product_state.dart';
import 'package:mobile_app/logic/wishlist/wishlist_bloc.dart';
import 'package:mobile_app/logic/wishlist/wishlist_event.dart';
import 'package:mobile_app/logic/wishlist/wishlist_state.dart';
import 'package:mobile_app/presentation/widgets/flash_product_card.dart';
import 'package:mobile_app/presentation/widgets/marquee_ticker_widget.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentNavIndex = 0;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<ProductBloc>().add(const FetchProductsEvent());
        context.read<CartBloc>().add(LoadCartEvent());
        context.read<WishlistBloc>().add(LoadWishlistEvent());
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onCategorySelected(int? categoryId) {
    context.read<ProductBloc>().add(SelectCategoryEvent(categoryId));
  }

  void _onAddToCart(ProductModel product) {
    final authState = context.read<AuthBloc>().state;
    if (authState is! Authenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Please sign in to reserve stock and add items to your cart.',
            style: GoogleFonts.manrope(color: C.text),
          ),
          backgroundColor: C.raised,
          action: SnackBarAction(
            label: 'SIGN IN',
            textColor: C.amber,
            onPressed: () => context.push('/login'),
          ),
        ),
      );
      context.push('/login');
      return;
    }

    context.read<CartBloc>().add(
          AddToCartEvent(
            productId: product.id,
            quantity: 1,
          ),
        );
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Text(
          'RESERVED: ${product.name}',
          style: GoogleFonts.jetBrainsMono(fontSize: 12, fontWeight: FontWeight.bold, color: C.text),
        ),
        backgroundColor: C.raised,
        duration: const Duration(seconds: 3),
        action: SnackBarAction(
          label: 'VIEW CART',
          textColor: C.amber,
          onPressed: () {
            messenger.hideCurrentSnackBar();
            context.push('/cart');
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: C.base,
      appBar: AppBar(
        backgroundColor: C.surface,
        elevation: 0,
        automaticallyImplyLeading: false,
        titleSpacing: 16,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'FLASH',
              style: GoogleFonts.sora(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: C.text,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(width: 4),
            Container(
              width: 6,
              height: 6,
              decoration: const BoxDecoration(
                color: C.amber,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 4),
            Text(
              'SALE',
              style: GoogleFonts.sora(
                fontSize: 17,
                fontWeight: FontWeight.w400,
                color: C.textDim,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
        actions: [
          // Wishlist Action with Badge
          BlocBuilder<WishlistBloc, WishlistState>(
            builder: (context, state) {
              int wishlistCount = 0;
              if (state is WishlistLoaded) {
                wishlistCount = state.items.length;
              }
              return Stack(
                alignment: Alignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.favorite_border, color: C.textDim, size: 22),
                    onPressed: () => context.push('/wishlist'),
                  ),
                  if (wishlistCount > 0)
                    Positioned(
                      right: 6,
                      top: 8,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: const BoxDecoration(
                          color: C.amber,
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(minWidth: 15, minHeight: 15),
                        child: Text(
                          '$wishlistCount',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.jetBrainsMono(
                            color: C.onAmber,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),

          // Cart Action with Badge
          BlocBuilder<CartBloc, CartState>(
            builder: (context, state) {
              int count = 0;
              if (state is CartLoaded) {
                count = state.cart.itemCount;
              }
              return Stack(
                alignment: Alignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.shopping_bag_outlined, color: C.textDim, size: 22),
                    onPressed: () => context.push('/cart'),
                  ),
                  if (count > 0)
                    Positioned(
                      right: 6,
                      top: 8,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: const BoxDecoration(
                          color: C.amber,
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(minWidth: 15, minHeight: 15),
                        child: Text(
                          '$count',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.jetBrainsMono(
                            color: C.onAmber,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(width: 8),
        ],
        bottom: const MarqueeTickerWidget(),
      ),
      body: RefreshIndicator(
        color: C.amber,
        backgroundColor: C.raised,
        onRefresh: () async {
          context.read<ProductBloc>().add(const FetchProductsEvent(isRefresh: true));
          context.read<CartBloc>().add(LoadCartEvent());
        },
        child: CustomScrollView(
          slivers: [
            // Search Bar Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: TextField(
                  controller: _searchController,
                  onChanged: (val) {
                    context.read<ProductBloc>().add(SearchQueryChangedEvent(val));
                  },
                  style: GoogleFonts.manrope(fontSize: 13, color: C.text),
                  decoration: InputDecoration(
                    hintText: 'SEARCH FLOORS & COMMODITIES...',
                    hintStyle: GoogleFonts.jetBrainsMono(fontSize: 11, color: C.textMute),
                    prefixIcon: const Icon(Icons.search, size: 18, color: C.textMute),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.close, size: 16, color: C.textMute),
                            onPressed: () {
                              _searchController.clear();
                              context.read<ProductBloc>().add(const SearchQueryChangedEvent(''));
                              setState(() {});
                            },
                          )
                        : null,
                  ),
                ),
              ),
            ),

            // Category Filter Chips
            SliverToBoxAdapter(
              child: BlocBuilder<ProductBloc, ProductState>(
                builder: (context, state) {
                  int? selectedId;
                  List<dynamic> categories = [];

                  if (state is ProductLoaded) {
                    selectedId = state.selectedCategoryId;
                    categories = state.categories;
                  }

                  return SizedBox(
                    height: 38,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: categories.length + 1,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        if (index == 0) {
                          final isSelected = selectedId == null;
                          return ChoiceChip(
                            label: const Text('ALL POOLS'),
                            selected: isSelected,
                            selectedColor: C.amber,
                            backgroundColor: C.surface,
                            labelStyle: GoogleFonts.jetBrainsMono(
                              fontSize: 11,
                              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                              color: isSelected ? C.onAmber : C.textDim,
                            ),
                            side: BorderSide(
                              color: isSelected ? C.amber : C.line,
                              width: 1,
                            ),
                            onSelected: (_) => _onCategorySelected(null),
                          );
                        }

                        final category = categories[index - 1];
                        final isSelected = selectedId == category.id;

                        return ChoiceChip(
                          label: Text(category.name.toUpperCase()),
                          selected: isSelected,
                          selectedColor: C.amber,
                          backgroundColor: C.surface,
                          labelStyle: GoogleFonts.jetBrainsMono(
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                            color: isSelected ? C.onAmber : C.textDim,
                          ),
                          side: BorderSide(
                            color: isSelected ? C.amber : C.line,
                            width: 1,
                          ),
                          onSelected: (_) => _onCategorySelected(category.id),
                        );
                      },
                    ),
                  );
                },
              ),
            ),

            // Product Grid Area
            BlocBuilder<ProductBloc, ProductState>(
              builder: (context, state) {
                if (state is ProductLoading) {
                  return const SliverFillRemaining(
                    child: Center(
                      child: CircularProgressIndicator(color: C.amber),
                    ),
                  );
                }

                if (state is ProductError) {
                  return SliverFillRemaining(
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline, size: 48, color: C.rose),
                            const SizedBox(height: 12),
                            Text(
                              'Floor Feed Disconnected',
                              style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.bold, color: C.text),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              state.message,
                              textAlign: TextAlign.center,
                              style: GoogleFonts.manrope(fontSize: 12, color: C.textMute),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: () => context.read<ProductBloc>().add(const FetchProductsEvent()),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: C.amber,
                                foregroundColor: C.onAmber,
                                minimumSize: const Size(140, 40),
                              ),
                              child: const Text('RETRY'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }

                if (state is ProductLoaded) {
                  if (state.products.isEmpty) {
                    return SliverFillRemaining(
                      child: Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.inventory_2_outlined, color: C.textMute, size: 48),
                            const SizedBox(height: 12),
                            Text(
                              'NO PRODUCTS LOCATED',
                              style: GoogleFonts.jetBrainsMono(fontSize: 13, fontWeight: FontWeight.bold, color: C.textDim),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Try adjusting your search query or category filters.',
                              style: GoogleFonts.manrope(fontSize: 12, color: C.textMute),
                            ),
                          ],
                        ),
                      ),
                    );
                  }

                  return SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    sliver: SliverGrid(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.64,
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 12,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final product = state.products[index];
                          return FlashProductCard(
                            product: product,
                            onTap: () => context.push('/product/${product.id}'),
                            onAddToCart: () => _onAddToCart(product),
                          );
                        },
                        childCount: state.products.length,
                      ),
                    ),
                  );
                }

                return const SliverToBoxAdapter(child: SizedBox.shrink());
              },
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: C.surface,
          border: Border(top: BorderSide(color: C.line, width: 1)),
        ),
        child: BottomNavigationBar(
          type: BottomNavigationBarType.fixed,
          backgroundColor: C.surface,
          currentIndex: _currentNavIndex,
          selectedItemColor: C.amber,
          unselectedItemColor: C.textMute,
          selectedFontSize: 10,
          unselectedFontSize: 10,
          selectedLabelStyle: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.w800),
          unselectedLabelStyle: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.w600),
          onTap: (index) {
            setState(() => _currentNavIndex = index);
            if (index == 1) context.push('/wishlist');
            if (index == 2) context.push('/cart');
            if (index == 3) context.push('/orders');
            if (index == 4) context.push('/profile');
          },
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.bolt, size: 20),
              label: 'Floor',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.favorite_border, size: 20),
              label: 'Wishlist',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.shopping_bag_outlined, size: 20),
              label: 'Cart',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.receipt_long_outlined, size: 20),
              label: 'Orders',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline, size: 20),
              label: 'Account',
            ),
          ],
        ),
      ),
    );
  }
}
