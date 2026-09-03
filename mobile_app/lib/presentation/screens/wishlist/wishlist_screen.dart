import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/theme_controller.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/wishlist_model.dart';
import 'package:mobile_app/logic/cart/cart_bloc.dart';
import 'package:mobile_app/logic/cart/cart_event.dart';
import 'package:mobile_app/logic/wishlist/wishlist_bloc.dart';
import 'package:mobile_app/logic/wishlist/wishlist_event.dart';
import 'package:mobile_app/logic/wishlist/wishlist_state.dart';
import 'package:mobile_app/presentation/widgets/app_toast.dart';
import 'package:mobile_app/presentation/widgets/price_text.dart';

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  @override
  void initState() {
    super.initState();
    context.read<WishlistBloc>().add(LoadWishlistEvent());
  }

  void _onMoveToCart(WishlistItemModel item) {
    if (item.product == null) return;
    context.read<CartBloc>().add(
          AddToCartEvent(
            productId: item.product!.id,
            product: item.product,
            quantity: 1,
          ),
        );
    context.read<WishlistBloc>().add(RemoveFromWishlistEvent(item.id));
    AppToast.showReserved(
      context,
      productName: item.product!.name,
      quantity: 1,
    );
  }

  void _onRemove(WishlistItemModel item) {
    context.read<WishlistBloc>().add(RemoveFromWishlistEvent(item.id));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final amberColor = isDark ? C.darkAmber : C.lightAmber;
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final secondaryTextColor = isDark ? C.darkTextDim : const Color(0xFF4B5563);
    final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);
    final cardBg = isDark ? C.darkSurface : Colors.white;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
        title: Text(
          'SAVED VAULT',
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
      body: RefreshIndicator(
        color: amberColor,
        backgroundColor: cardBg,
        onRefresh: () async {
          context.read<WishlistBloc>().add(LoadWishlistEvent());
        },
        child: BlocBuilder<WishlistBloc, WishlistState>(
          builder: (context, state) {
            if (state is WishlistLoading) {
              return Center(child: CircularProgressIndicator(color: amberColor));
            } else if (state is WishlistError) {
              final roseColor = isDark ? C.darkRose : C.lightRose;
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline, size: 44, color: roseColor),
                      const SizedBox(height: 12),
                      Text(state.message, textAlign: TextAlign.center, style: GoogleFonts.manrope(color: muteTextColor)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => context.read<WishlistBloc>().add(LoadWishlistEvent()),
                        child: const Text('RETRY'),
                      ),
                    ],
                  ),
                ),
              );
            } else if (state is WishlistLoaded) {
              if (state.items.isEmpty) {
                return _buildEmptyState(isDark, primaryTextColor, muteTextColor, amberColor);
              }
              return _buildWishlistGrid(state.items, isDark, primaryTextColor, secondaryTextColor, muteTextColor, cardBg, amberColor);
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool isDark, Color primaryTextColor, Color muteTextColor, Color amberColor) {
    return ScrollConfiguration(
      behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
      child: Center(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: isDark ? C.darkRaised : const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(C.radiusCard),
                  border: Border.all(color: isDark ? C.darkLine : const Color(0xFFE5E7EB)),
                ),
                child: Icon(Icons.favorite, size: 36, color: amberColor),
              ),
              const SizedBox(height: 16),
              Text(
                'Your Saved Vault is Empty',
                textAlign: TextAlign.center,
                style: GoogleFonts.sora(fontSize: 20, fontWeight: FontWeight.bold, color: primaryTextColor),
              ),
              const SizedBox(height: 6),
              Text(
                'Save items here to track lightning price drops & stock releases.',
                textAlign: TextAlign.center,
                style: GoogleFonts.manrope(fontSize: 12, color: muteTextColor),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () => context.go('/home'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: amberColor,
                  foregroundColor: isDark ? C.darkOnAmber : Colors.white,
                ),
                child: const Text('RETURN TO THE FLOOR'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWishlistGrid(List<WishlistItemModel> items, bool isDark, Color primaryTextColor, Color secondaryTextColor, Color muteTextColor, Color cardBg, Color amberColor) {
    final screenWidth = MediaQuery.sizeOf(context).width;
    final crossAxisCount = screenWidth >= 1100 ? 4 : (screenWidth >= 700 ? 3 : 2);
    final cardBorder = isDark ? C.darkLine : const Color(0xFFE5E7EB);
    final onAmberColor = isDark ? C.darkOnAmber : Colors.white;

    return GridView.builder(
      physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        mainAxisExtent: 315,
        crossAxisSpacing: 12,
        mainAxisSpacing: 14,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        final product = item.product;
        if (product == null) return const SizedBox.shrink();

        final inStock = product.stock > 0;

        return Container(
          key: ValueKey('wishlist_item_${item.id}'),
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(C.radiusCard),
            border: Border.all(color: cardBorder),
            boxShadow: isDark
                ? null
                : [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Product Image with Heart & Delete
              Stack(
                children: [
                  GestureDetector(
                    onTap: () => context.push('/product/${product.id}'),
                    child: AspectRatio(
                      aspectRatio: 1.1,
                      child: product.imageUrl != null && product.imageUrl!.isNotEmpty
                          ? Image.network(
                              product.imageUrl!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => _buildPlaceholder(isDark, muteTextColor),
                            )
                          : _buildPlaceholder(isDark, muteTextColor),
                    ),
                  ),
                  Positioned(
                    top: 6,
                    right: 6,
                    child: GestureDetector(
                      onTap: () => _onRemove(item),
                      child: Container(
                        padding: const EdgeInsets.all(5),
                        decoration: BoxDecoration(
                          color: isDark ? const Color(0xCC0B0D0C) : Colors.white.withValues(alpha: 0.9),
                          shape: BoxShape.circle,
                          border: Border.all(color: cardBorder),
                        ),
                        child: Icon(Icons.close, size: 14, color: secondaryTextColor),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 6,
                    left: 6,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xCC0B0D0C) : Colors.white.withValues(alpha: 0.9),
                        shape: BoxShape.circle,
                        border: Border.all(color: cardBorder),
                      ),
                      child: Icon(Icons.favorite, size: 14, color: amberColor),
                    ),
                  ),
                ],
              ),

              // Info Section
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        (product.categoryName ?? 'CATALOG').toUpperCase(),
                        style: GoogleFonts.jetBrainsMono(
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                          color: muteTextColor,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        product.name,
                        style: GoogleFonts.sora(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: primaryTextColor,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const Spacer(),
                      PriceText(amount: product.currentPrice, size: PriceTextSize.sm, color: primaryTextColor),
                      const SizedBox(height: 8),

                      // Move to Cart Button
                      SizedBox(
                        width: double.infinity,
                        height: 32,
                        child: ElevatedButton(
                          onPressed: inStock ? () => _onMoveToCart(item) : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: inStock ? amberColor : (isDark ? C.darkRaised : const Color(0xFFF3F4F6)),
                            foregroundColor: inStock ? onAmberColor : muteTextColor,
                            padding: EdgeInsets.zero,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(C.radiusCard),
                            ),
                          ),
                          child: Text(
                            inStock ? 'MOVE TO CART' : 'OUT OF STOCK',
                            style: GoogleFonts.manrope(fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPlaceholder(bool isDark, Color muteTextColor) {
    return Container(
      color: isDark ? C.darkRaised : const Color(0xFFF3F4F6),
      child: Center(
        child: Icon(Icons.shopping_bag_outlined, color: muteTextColor, size: 32),
      ),
    );
  }
}
