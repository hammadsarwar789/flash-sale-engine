import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/theme_controller.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/logic/cart/cart_bloc.dart';
import 'package:mobile_app/logic/cart/cart_event.dart';
import 'package:mobile_app/logic/cart/cart_state.dart';
import 'package:mobile_app/logic/products/product_bloc.dart';
import 'package:mobile_app/logic/products/product_event.dart';
import 'package:mobile_app/logic/products/product_state.dart';
import 'package:mobile_app/logic/wishlist/wishlist_bloc.dart';
import 'package:mobile_app/logic/wishlist/wishlist_event.dart';
import 'package:mobile_app/logic/wishlist/wishlist_state.dart';
import 'package:mobile_app/presentation/widgets/app_toast.dart';
import 'package:mobile_app/presentation/widgets/flash_product_card.dart';
import 'package:mobile_app/presentation/widgets/marquee_ticker_widget.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
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

  void _onAddToCart(ProductModel product) {
    context.read<CartBloc>().add(
          AddToCartEvent(
            productId: product.id,
            quantity: 1,
            product: product,
          ),
        );
    AppToast.showReserved(
      context,
      productName: product.name,
      quantity: 1,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final amberColor = isDark ? C.darkAmber : C.lightAmber;
    final onAmberColor = isDark ? C.darkOnAmber : Colors.white;
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final secondaryTextColor = isDark ? C.darkTextDim : const Color(0xFF4B5563);
    final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);
    final cardBg = isDark ? C.darkSurface : Colors.white;
    final cardBorder = isDark ? C.darkLine : const Color(0xFFE5E7EB);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
        titleSpacing: 12,
        title: FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'FLASH',
                style: GoogleFonts.sora(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: primaryTextColor,
                  letterSpacing: 0.3,
                ),
              ),
              const SizedBox(width: 4),
              Container(
                width: 5,
                height: 5,
                decoration: BoxDecoration(
                  color: amberColor,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 4),
              Text(
                'SALE',
                style: GoogleFonts.sora(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: secondaryTextColor,
                  letterSpacing: 0.3,
                ),
              ),
            ],
          ),
        ),
        actions: [
          // Theme Toggle (Sun / Moon)
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
                    icon: Icon(Icons.favorite_border, color: secondaryTextColor, size: 22),
                    onPressed: () => context.go('/wishlist'),
                  ),
                  if (wishlistCount > 0)
                    Positioned(
                      right: 6,
                      top: 8,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: amberColor,
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(minWidth: 15, minHeight: 15),
                        child: Text(
                          '$wishlistCount',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.jetBrainsMono(
                            color: onAmberColor,
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
                    icon: Icon(Icons.shopping_bag_outlined, color: secondaryTextColor, size: 22),
                    onPressed: () => context.go('/cart'),
                  ),
                  if (count > 0)
                    Positioned(
                      right: 6,
                      top: 8,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: amberColor,
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(minWidth: 15, minHeight: 15),
                        child: Text(
                          '$count',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.jetBrainsMono(
                            color: onAmberColor,
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
        color: amberColor,
        backgroundColor: cardBg,
        onRefresh: () async {
          context.read<ProductBloc>().add(const FetchProductsEvent(isRefresh: true));
          context.read<CartBloc>().add(LoadCartEvent());
        },
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
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
                  style: GoogleFonts.manrope(fontSize: 13, color: primaryTextColor),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: cardBg,
                    hintText: 'SEARCH FLOORS & COMMODITIES...',
                    hintStyle: GoogleFonts.jetBrainsMono(fontSize: 11, color: muteTextColor),
                    prefixIcon: Icon(Icons.search, size: 18, color: muteTextColor),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: Icon(Icons.close, size: 16, color: muteTextColor),
                            onPressed: () {
                              _searchController.clear();
                              context.read<ProductBloc>().add(const SearchQueryChangedEvent(''));
                              setState(() {});
                            },
                          )
                        : null,
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(C.radiusCard),
                      borderSide: BorderSide(color: cardBorder, width: 1),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(C.radiusCard),
                      borderSide: BorderSide(color: amberColor, width: 1.5),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                ),
              ),
            ),

            // Category Filter Chips
            SliverToBoxAdapter(
              child: BlocBuilder<ProductBloc, ProductState>(
                builder: (context, state) {
                  String selectedCategory = 'ALL POOLS';
                  final List<String> chipCategories = ['ALL POOLS', 'FOOTWEAR', 'OUTERWEAR', 'TECH'];

                  if (state is ProductLoaded) {
                    selectedCategory = state.selectedCategory;
                    for (final c in state.categories) {
                      final name = c.name.toUpperCase();
                      if (!chipCategories.contains(name)) {
                        chipCategories.add(name);
                      }
                    }
                    for (final p in state.allProducts) {
                      final cat = p.category.toUpperCase();
                      if (cat.isNotEmpty && !chipCategories.contains(cat) && cat != 'CATALOG') {
                        chipCategories.add(cat);
                      }
                    }
                  }

                  return SizedBox(
                    height: 38,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: chipCategories.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 8),
                      itemBuilder: (context, index) {
                        final chipCategory = chipCategories[index];
                        final isSelected = selectedCategory.toUpperCase() == chipCategory.toUpperCase();

                        return ChoiceChip(
                          key: ValueKey('cat_chip_$chipCategory'),
                          label: Text(chipCategory),
                          selected: isSelected,
                          selectedColor: amberColor,
                          backgroundColor: cardBg,
                          labelStyle: GoogleFonts.jetBrainsMono(
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                            color: isSelected ? onAmberColor : secondaryTextColor,
                          ),
                          side: BorderSide(
                            color: isSelected ? amberColor : cardBorder,
                            width: 1,
                          ),
                          onSelected: (_) {
                            context.read<ProductBloc>().add(FilterByCategoryEvent(category: chipCategory));
                          },
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
                  return SliverFillRemaining(
                    child: Center(
                      child: CircularProgressIndicator(color: amberColor),
                    ),
                  );
                }

                if (state is ProductError) {
                  final roseColor = isDark ? C.darkRose : C.lightRose;
                  return SliverFillRemaining(
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.error_outline, size: 48, color: roseColor),
                            const SizedBox(height: 12),
                            Text(
                              'Floor Feed Disconnected',
                              style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.bold, color: primaryTextColor),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              state.message,
                              textAlign: TextAlign.center,
                              style: GoogleFonts.manrope(fontSize: 12, color: muteTextColor),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: () => context.read<ProductBloc>().add(const FetchProductsEvent()),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: amberColor,
                                foregroundColor: onAmberColor,
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
                  final displayProducts = state.filteredProducts;
                  if (displayProducts.isEmpty) {
                    return SliverFillRemaining(
                      child: ScrollConfiguration(
                        behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
                        child: Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.inventory_2_outlined, color: muteTextColor, size: 48),
                              const SizedBox(height: 12),
                              Text(
                                'NO PRODUCTS LOCATED',
                                style: GoogleFonts.jetBrainsMono(fontSize: 13, fontWeight: FontWeight.bold, color: secondaryTextColor),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Try adjusting your search query or category filters.',
                                style: GoogleFonts.manrope(fontSize: 12, color: muteTextColor),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }

                  final screenWidth = MediaQuery.sizeOf(context).width;
                  final crossAxisCount = screenWidth >= 1100 ? 4 : (screenWidth >= 700 ? 3 : 2);

                  return SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    sliver: SliverGrid(
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: crossAxisCount,
                        mainAxisExtent: 295,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 14,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final product = displayProducts[index];
                          return FlashProductCard(
                            key: ValueKey('product_${product.id}'),
                            product: product,
                            onTap: () => context.push('/product/${product.id}'),
                            onAddToCart: () => _onAddToCart(product),
                          );
                        },
                        childCount: displayProducts.length,
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
    );
  }
}
