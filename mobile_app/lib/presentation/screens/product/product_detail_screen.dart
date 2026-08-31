import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/data/repositories/product_repository.dart';
import 'package:mobile_app/logic/auth/auth_bloc.dart';
import 'package:mobile_app/logic/auth/auth_state.dart';
import 'package:mobile_app/logic/cart/cart_bloc.dart';
import 'package:mobile_app/logic/cart/cart_event.dart';
import 'package:mobile_app/logic/wishlist/wishlist_bloc.dart';
import 'package:mobile_app/logic/wishlist/wishlist_event.dart';
import 'package:mobile_app/logic/wishlist/wishlist_state.dart';
import 'package:mobile_app/presentation/widgets/price_text.dart';
import 'package:mobile_app/presentation/widgets/stock_progress_bar.dart';

class ProductDetailScreen extends StatefulWidget {
  final dynamic productId;

  const ProductDetailScreen({super.key, required this.productId});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  ProductModel? _product;
  List<VariantModel> _variants = [];
  VariantModel? _selectedVariant;
  List<ReviewModel> _reviews = [];
  int _quantity = 1;
  int _selectedImageIndex = 0;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadProductData();
  }

  Future<void> _loadProductData() async {
    try {
      final repo = context.read<ProductRepository>();
      final product = await repo.getProductById(widget.productId);

      List<VariantModel> variants = product.variants;
      if (variants.isEmpty) {
        try {
          variants = await repo.getProductVariants(widget.productId);
        } catch (_) {}
      }

      List<ReviewModel> reviews = [];
      try {
        reviews = await repo.getProductReviews(widget.productId);
      } catch (_) {}

      if (mounted) {
        setState(() {
          _product = product;
          _variants = variants;
          _selectedVariant = variants.isNotEmpty ? variants.first : null;
          _reviews = reviews;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  double get _activePrice {
    if (_selectedVariant != null) {
      return _selectedVariant!.price;
    }
    return _product?.currentPrice ?? 0.0;
  }

  int get _activeStock {
    if (_selectedVariant != null) {
      return _selectedVariant!.stock;
    }
    return _product?.stock ?? 0;
  }

  bool get _isSoldOut => _activeStock <= 0;

  void _onAddToCart() {
    if (_product == null) return;

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

    final variantIdInt = _selectedVariant?.id != null ? int.tryParse(_selectedVariant!.id.toString()) : null;

    context.read<CartBloc>().add(
          AddToCartEvent(
            productId: _product!.id,
            variantId: variantIdInt,
            quantity: _quantity,
          ),
        );
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'RESERVED: ${_product!.name} (QTY $_quantity)',
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

  void _showReviewBottomSheet() {
    final titleController = TextEditingController();
    final commentController = TextEditingController();
    int rating = 5;
    bool isSubmitting = false;

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
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Write Verified Review',
                    style: GoogleFonts.sora(fontSize: 17, fontWeight: FontWeight.bold, color: C.text),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20, color: C.textMute),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                'RATING',
                style: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.bold, color: C.textMute),
              ),
              const SizedBox(height: 6),
              Row(
                children: List.generate(5, (index) {
                  final starIndex = index + 1;
                  return IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                    icon: Icon(
                      starIndex <= rating ? Icons.star : Icons.star_border,
                      color: C.amber,
                      size: 28,
                    ),
                    onPressed: () => setSheetState(() => rating = starIndex),
                  );
                }),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: titleController,
                decoration: const InputDecoration(
                  labelText: 'Headline',
                  hintText: 'e.g. Excellent build quality!',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: commentController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Feedback & Specifications',
                  hintText: 'Share your experience with this commodity...',
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: isSubmitting
                    ? null
                    : () async {
                        setSheetState(() => isSubmitting = true);
                        try {
                          final repo = context.read<ProductRepository>();
                          final newReview = await repo.submitProductReview(
                            widget.productId,
                            rating: rating,
                            title: titleController.text.trim().isNotEmpty
                                ? titleController.text.trim()
                                : null,
                            comment: commentController.text.trim().isNotEmpty
                                ? commentController.text.trim()
                                : null,
                          );
                          if (mounted) {
                            setState(() {
                              _reviews.insert(0, newReview);
                            });
                          }
                          if (ctx.mounted) Navigator.pop(ctx);
                        } catch (e) {
                          setSheetState(() => isSubmitting = false);
                        }
                      },
                child: Text(
                  isSubmitting ? 'SUBMITTING...' : 'SUBMIT REVIEW',
                  style: GoogleFonts.manrope(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: C.base,
        body: Center(child: CircularProgressIndicator(color: C.amber)),
      );
    }

    if (_errorMessage != null || _product == null) {
      return Scaffold(
        backgroundColor: C.base,
        appBar: AppBar(title: const Text('Product Detail')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.warning_amber_rounded, color: C.rose, size: 48),
                const SizedBox(height: 12),
                Text(
                  'Product Not Located',
                  style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.bold, color: C.text),
                ),
                const SizedBox(height: 6),
                Text(
                  _errorMessage ?? 'Unable to find item on the floor.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.manrope(fontSize: 12, color: C.textMute),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => context.pop(),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: C.amber,
                    foregroundColor: C.onAmber,
                  ),
                  child: const Text('RETURN TO THE FLOOR'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final product = _product!;
    final images = product.images.isNotEmpty
        ? product.images
        : (product.imageUrl != null && product.imageUrl!.isNotEmpty ? [product.imageUrl!] : []);

    return Scaffold(
      backgroundColor: C.base,
      appBar: AppBar(
        backgroundColor: C.surface,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: C.text),
          onPressed: () => context.pop(),
        ),
        title: Text(
          product.name,
          style: GoogleFonts.sora(fontSize: 15, fontWeight: FontWeight.w700, color: C.text),
        ),
        actions: [
          // Wishlist Toggle
          BlocBuilder<WishlistBloc, WishlistState>(
            builder: (context, state) {
              bool isSaved = false;
              String? wishlistItemId;
              if (state is WishlistLoaded) {
                final match = state.items.where((i) => i.productId.toString() == product.id.toString()).toList();
                if (match.isNotEmpty) {
                  isSaved = true;
                  wishlistItemId = match.first.id;
                }
              }

              return IconButton(
                icon: Icon(
                  isSaved ? Icons.favorite : Icons.favorite_border,
                  color: isSaved ? C.amber : C.textDim,
                ),
                onPressed: () {
                  final authState = context.read<AuthBloc>().state;
                  if (authState is! Authenticated) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          'Please sign in to save items to your wishlist.',
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
                  if (isSaved && wishlistItemId != null) {
                    context.read<WishlistBloc>().add(RemoveFromWishlistEvent(wishlistItemId));
                  } else {
                    context.read<WishlistBloc>().add(AddToWishlistEvent(product.id));
                  }
                },
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image Carousel
            if (images.isNotEmpty) ...[
              Container(
                height: 280,
                color: C.raised,
                child: PageView.builder(
                  itemCount: images.length,
                  onPageChanged: (i) => setState(() => _selectedImageIndex = i),
                  itemBuilder: (context, index) {
                    return Image.network(
                      images[index],
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => const Center(
                        child: Icon(Icons.shopping_bag_outlined, color: C.textMute, size: 48),
                      ),
                    );
                  },
                ),
              ),
              if (images.length > 1)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(images.length, (i) {
                      final isActive = _selectedImageIndex == i;
                      return Container(
                        margin: const EdgeInsets.symmetric(horizontal: 3),
                        width: isActive ? 16 : 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: isActive ? C.amber : C.line,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      );
                    }),
                  ),
                ),
            ],

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category & SKU
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      if (product.categoryName != null)
                        Text(
                          product.categoryName!.toUpperCase(),
                          style: GoogleFonts.jetBrainsMono(
                            color: C.amber,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                      Text(
                        'SKU: ${_selectedVariant?.sku ?? product.sku ?? "FSE-COMMODITY"}',
                        style: GoogleFonts.jetBrainsMono(color: C.textMute, fontSize: 10),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Product Title
                  Text(
                    product.name,
                    style: GoogleFonts.sora(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: C.text,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Price
                  PriceText(
                    amount: _activePrice,
                    originalAmount: product.discountPercentage > 0 ? product.price : null,
                    size: PriceTextSize.xl,
                  ),
                  const SizedBox(height: 12),

                  // Stock Bar
                  StockProgressBar(
                    stock: _activeStock,
                    initialStock: product.initialStock,
                    variant: StockBarVariant.continuous,
                  ),
                  const SizedBox(height: 16),

                  // Variants Picker
                  if (_variants.isNotEmpty) ...[
                    Text(
                      'SPECIFICATION OPTIONS',
                      style: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.bold, color: C.textMute),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _variants.map((v) {
                        final isSelected = _selectedVariant?.id == v.id;
                        final label = [v.color, v.size].where((s) => s != null && s.isNotEmpty).join(' · ');
                        final displayLabel = label.isNotEmpty ? label : (v.name ?? 'Standard');

                        return ChoiceChip(
                          label: Text(displayLabel),
                          selected: isSelected,
                          selectedColor: C.amber,
                          backgroundColor: C.raised,
                          labelStyle: GoogleFonts.jetBrainsMono(
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                            color: isSelected ? C.onAmber : C.textDim,
                          ),
                          side: BorderSide(
                            color: isSelected ? C.amber : C.line,
                            width: 1,
                          ),
                          onSelected: (_) {
                            setState(() {
                              _selectedVariant = v;
                              if (_quantity > v.stock && v.stock > 0) {
                                _quantity = v.stock;
                              }
                            });
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Description
                  if (product.description != null && product.description!.isNotEmpty) ...[
                    Text(
                      'PRODUCT SPECIFICATIONS',
                      style: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.bold, color: C.textMute),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      product.description!,
                      style: GoogleFonts.manrope(fontSize: 13, color: C.textDim, height: 1.5),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // Reviews Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'CUSTOMER REVIEWS (${_reviews.length})',
                        style: GoogleFonts.jetBrainsMono(fontSize: 11, fontWeight: FontWeight.bold, color: C.text),
                      ),
                      TextButton(
                        onPressed: _showReviewBottomSheet,
                        child: Text(
                          '+ WRITE REVIEW',
                          style: GoogleFonts.manrope(fontSize: 11, fontWeight: FontWeight.bold, color: C.amber),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  if (_reviews.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: C.surface,
                        borderRadius: BorderRadius.circular(C.radiusCard),
                        border: Border.all(color: C.line),
                      ),
                      child: Center(
                        child: Text(
                          'No reviews submitted yet. Be the first to verify this commodity lot.',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.manrope(fontSize: 12, color: C.textMute),
                        ),
                      ),
                    )
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _reviews.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, i) {
                        final r = _reviews[i];
                        return Container(
                          padding: const EdgeInsets.all(12),
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
                                  Row(
                                    children: List.generate(
                                      5,
                                      (star) => Icon(
                                        star < r.rating ? Icons.star : Icons.star_border,
                                        color: C.amber,
                                        size: 14,
                                      ),
                                    ),
                                  ),
                                  Text(
                                    r.userName ?? 'Verified Trader',
                                    style: GoogleFonts.manrope(fontSize: 11, color: C.textMute),
                                  ),
                                ],
                              ),
                              if (r.title != null && r.title!.isNotEmpty) ...[
                                const SizedBox(height: 4),
                                Text(
                                  r.title!,
                                  style: GoogleFonts.manrope(fontSize: 13, fontWeight: FontWeight.bold, color: C.text),
                                ),
                              ],
                              if (r.comment != null && r.comment!.isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  r.comment!,
                                  style: GoogleFonts.manrope(fontSize: 12, color: C.textDim),
                                ),
                              ],
                            ],
                          ),
                        );
                      },
                    ),
                  const SizedBox(height: 80),
                ],
              ),
            ),
          ],
        ),
      ),

      // Sticky Bottom Action Bar
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: const BoxDecoration(
          color: C.surface,
          border: Border(top: BorderSide(color: C.line, width: 1)),
        ),
        child: SafeArea(
          child: Row(
            children: [
              // 999px Stadium Stepper
              Container(
                decoration: BoxDecoration(
                  color: C.raised,
                  borderRadius: BorderRadius.circular(C.radiusPill),
                  border: Border.all(color: C.line),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove, size: 16, color: C.textDim),
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      padding: EdgeInsets.zero,
                      onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                    ),
                    Text(
                      '$_quantity',
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: C.text,
                        fontFeatures: [const FontFeature.tabularFigures()],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.add, size: 16, color: C.textDim),
                      constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                      padding: EdgeInsets.zero,
                      onPressed: _quantity < _activeStock ? () => setState(() => _quantity++) : null,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),

              // Add to Cart Button
              Expanded(
                child: ElevatedButton(
                  onPressed: _isSoldOut ? null : _onAddToCart,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: C.amber,
                    foregroundColor: C.onAmber,
                    minimumSize: const Size.fromHeight(44),
                  ),
                  child: Text(
                    _isSoldOut
                        ? 'SOLD OUT'
                        : 'ADD TO CART — \$${(_activePrice * _quantity).toStringAsFixed(2)}',
                    style: GoogleFonts.manrope(fontWeight: FontWeight.bold, fontSize: 13),
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
