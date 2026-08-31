import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/wishlist_model.dart';
import 'package:mobile_app/logic/cart/cart_bloc.dart';
import 'package:mobile_app/logic/cart/cart_event.dart';
import 'package:mobile_app/logic/wishlist/wishlist_bloc.dart';
import 'package:mobile_app/logic/wishlist/wishlist_event.dart';
import 'package:mobile_app/logic/wishlist/wishlist_state.dart';
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
            quantity: 1,
          ),
        );
    context.read<WishlistBloc>().add(RemoveFromWishlistEvent(item.id));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '${item.product!.name} moved to cart',
          style: GoogleFonts.jetBrainsMono(fontSize: 12, fontWeight: FontWeight.bold, color: C.text),
        ),
        backgroundColor: C.raised,
        action: SnackBarAction(
          label: 'VIEW CART',
          textColor: C.amber,
          onPressed: () => context.push('/cart'),
        ),
      ),
    );
  }

  void _onRemove(WishlistItemModel item) {
    context.read<WishlistBloc>().add(RemoveFromWishlistEvent(item.id));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: C.base,
      appBar: AppBar(
        backgroundColor: C.surface,
        title: Text(
          'Saved Vault',
          style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: C.text),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: C.text),
          onPressed: () => context.pop(),
        ),
      ),
      body: RefreshIndicator(
        color: C.amber,
        backgroundColor: C.raised,
        onRefresh: () async {
          context.read<WishlistBloc>().add(LoadWishlistEvent());
        },
        child: BlocBuilder<WishlistBloc, WishlistState>(
          builder: (context, state) {
            if (state is WishlistLoading) {
              return const Center(child: CircularProgressIndicator(color: C.amber));
            } else if (state is WishlistError) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 44, color: C.rose),
                      const SizedBox(height: 12),
                      Text(state.message, textAlign: TextAlign.center, style: GoogleFonts.manrope(color: C.textMute)),
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
                return _buildEmptyState();
              }
              return _buildWishlistGrid(state.items);
            }
            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: C.raised,
                borderRadius: BorderRadius.circular(C.radiusCard),
                border: Border.all(color: C.line),
              ),
              child: const Icon(Icons.favorite, size: 36, color: C.amber),
            ),
            const SizedBox(height: 16),
            Text(
              'Wishlist is empty',
              style: GoogleFonts.sora(fontSize: 20, fontWeight: FontWeight.bold, color: C.text),
            ),
            const SizedBox(height: 6),
            Text(
              'Save items here to track lightning price drops & stock releases.',
              textAlign: TextAlign.center,
              style: GoogleFonts.manrope(fontSize: 12, color: C.textMute),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => context.go('/home'),
              child: const Text('RETURN TO THE FLOOR'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWishlistGrid(List<WishlistItemModel> items) {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.58,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        final product = item.product;
        if (product == null) return const SizedBox.shrink();

        final inStock = product.stock > 0;

        return Container(
          decoration: BoxDecoration(
            color: C.surface,
            borderRadius: BorderRadius.circular(C.radiusCard),
            border: Border.all(color: C.line),
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
                              errorBuilder: (_, __, ___) => _buildPlaceholder(),
                            )
                          : _buildPlaceholder(),
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
                          color: C.base.withOpacity(0.7),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close, size: 14, color: C.textDim),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 6,
                    left: 6,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: C.base.withOpacity(0.7),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.favorite, size: 14, color: C.amber),
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
                      if (product.categoryName != null)
                        Text(
                          product.categoryName!.toUpperCase(),
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: C.textMute,
                          ),
                        ),
                      const SizedBox(height: 2),
                      Text(
                        product.name,
                        style: GoogleFonts.manrope(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: C.text,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const Spacer(),
                      PriceText(amount: product.currentPrice, size: PriceTextSize.sm),
                      const SizedBox(height: 8),

                      // Move to Cart Button
                      SizedBox(
                        width: double.infinity,
                        height: 30,
                        child: ElevatedButton(
                          onPressed: inStock ? () => _onMoveToCart(item) : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: inStock ? C.amber : C.raised,
                            foregroundColor: inStock ? C.onAmber : C.textMute,
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

  Widget _buildPlaceholder() {
    return Container(
      color: C.raised,
      child: const Center(
        child: Icon(Icons.shopping_bag_outlined, color: C.textMute, size: 32),
      ),
    );
  }
}
