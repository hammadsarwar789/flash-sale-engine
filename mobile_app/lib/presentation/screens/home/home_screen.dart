import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_app/core/theme/app_theme.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/logic/cart/cart_bloc.dart';
import 'package:mobile_app/logic/cart/cart_event.dart';
import 'package:mobile_app/logic/cart/cart_state.dart';
import 'package:mobile_app/logic/products/product_bloc.dart';
import 'package:mobile_app/logic/products/product_event.dart';
import 'package:mobile_app/logic/products/product_state.dart';
import 'package:mobile_app/presentation/widgets/countdown_timer_widget.dart';
import 'package:mobile_app/presentation/widgets/flash_product_card.dart';

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
    context.read<ProductBloc>().add(const FetchProductsEvent());
    context.read<CartBloc>().add(LoadCartEvent());
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
    context.read<CartBloc>().add(
          AddToCartEvent(
            productId: product.id,
            quantity: 1,
          ),
        );
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product.name} added to cart!'),
        backgroundColor: AppColors.surfaceElevated,
        duration: const Duration(seconds: 2),
        action: SnackBarAction(
          label: 'VIEW CART',
          textColor: AppColors.secondary,
          onPressed: () => context.push('/cart'),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.accentFlash.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.bolt, color: AppColors.accentFlash, size: 22),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'FLASH SALE',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                  ),
                ),
                Text(
                  'Live Inventory Drop',
                  style: TextStyle(fontSize: 10, color: AppColors.secondary),
                ),
              ],
            ),
          ],
        ),
        actions: [
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
                    icon: const Icon(Icons.shopping_cart_outlined),
                    onPressed: () => context.push('/cart'),
                  ),
                  if (count > 0)
                    Positioned(
                      right: 8,
                      top: 8,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(
                          color: AppColors.accentFlash,
                          shape: BoxShape.circle,
                        ),
                        constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                        child: Text(
                          '$count',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
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
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          context.read<ProductBloc>().add(const FetchProductsEvent(isRefresh: true));
          context.read<CartBloc>().add(LoadCartEvent());
        },
        child: CustomScrollView(
          slivers: [
            // Search Bar Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: TextField(
                  controller: _searchController,
                  onChanged: (val) {
                    context.read<ProductBloc>().add(SearchQueryChangedEvent(val));
                  },
                  decoration: InputDecoration(
                    hintText: 'Search flash deals, electronics, gear...',
                    prefixIcon: const Icon(Icons.search, color: AppColors.textMuted),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              context.read<ProductBloc>().add(const SearchQueryChangedEvent(''));
                            },
                          )
                        : null,
                  ),
                ),
              ),
            ),

            // Live Flash Sale Banner
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        const Color(0xFF881337).withOpacity(0.85),
                        const Color(0xFF1E1B4B).withOpacity(0.85),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.accentFlash.withOpacity(0.4)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.local_fire_department, color: Colors.orangeAccent, size: 22),
                              SizedBox(width: 6),
                              Text(
                                'MIDNIGHT FLASH DROP',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  letterSpacing: 1.0,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.accentFlash,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text(
                              'LIVE NOW',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      CountdownTimerWidget(
                        targetEndTime: DateTime.now().add(const Duration(hours: 4, minutes: 27)),
                        label: 'SALE ENDS',
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Up to 70% off high-concurrency reserved items. Stock claims expire in 10 minutes.',
                        style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Category Selector Pills
            BlocBuilder<ProductBloc, ProductState>(
              builder: (context, state) {
                if (state is ProductLoaded && state.categories.isNotEmpty) {
                  return SliverToBoxAdapter(
                    child: SizedBox(
                      height: 48,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        children: [
                          ChoiceChip(
                            label: const Text('All Products'),
                            selected: state.selectedCategoryId == null,
                            onSelected: (_) => _onCategorySelected(null),
                            selectedColor: AppColors.primary,
                            backgroundColor: AppColors.surface,
                            labelStyle: TextStyle(
                              color: state.selectedCategoryId == null ? Colors.white : AppColors.textSecondary,
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                            ),
                          ),
                          const SizedBox(width: 8),
                          ...state.categories.map((cat) {
                            final isSelected = state.selectedCategoryId == cat.id;
                            return Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(
                                label: Text(cat.name),
                                selected: isSelected,
                                onSelected: (_) => _onCategorySelected(cat.id),
                                selectedColor: AppColors.primary,
                                backgroundColor: AppColors.surface,
                                labelStyle: TextStyle(
                                  color: isSelected ? Colors.white : AppColors.textSecondary,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                            );
                          }),
                        ],
                      ),
                    ),
                  );
                }
                return const SliverToBoxAdapter(child: SizedBox.shrink());
              },
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 12)),

            // Products Grid
            BlocBuilder<ProductBloc, ProductState>(
              builder: (context, state) {
                if (state is ProductLoading) {
                  return const SliverFillRemaining(
                    child: Center(
                      child: CircularProgressIndicator(color: AppColors.accentFlash),
                    ),
                  );
                } else if (state is ProductError) {
                  return SliverFillRemaining(
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.cloud_off, size: 48, color: AppColors.accentFlash),
                            const SizedBox(height: 12),
                            Text(
                              state.message,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: () => context.read<ProductBloc>().add(const FetchProductsEvent()),
                              child: const Text('Try Again'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                } else if (state is ProductLoaded) {
                  final displayList = state.products;

                  if (displayList.isEmpty) {
                    return const SliverFillRemaining(
                      child: Center(
                        child: Text(
                          'No products found matching your search.',
                          style: TextStyle(color: AppColors.textMuted),
                        ),
                      ),
                    );
                  }

                  return SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
                    sliver: SliverGrid(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 0.58,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final product = displayList[index];
                          return FlashProductCard(
                            product: product,
                            onTap: () => context.push('/product/${product.id}'),
                            onAddToCart: () => _onAddToCart(product),
                          );
                        },
                        childCount: displayList.length,
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
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentNavIndex,
        onTap: (index) {
          setState(() => _currentNavIndex = index);
          if (index == 1) context.push('/cart');
          if (index == 2) context.push('/orders');
          if (index == 3) context.push('/profile');
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.bolt),
            label: 'Deals',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.shopping_cart_outlined),
            label: 'Cart',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long_outlined),
            label: 'Orders',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
