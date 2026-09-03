import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/data/repositories/product_repository.dart';
import 'package:mobile_app/logic/cart/cart_bloc.dart';
import 'package:mobile_app/logic/cart/cart_event.dart';
import 'package:mobile_app/logic/auth/auth_bloc.dart';
import 'package:mobile_app/logic/auth/auth_state.dart';
import 'package:mobile_app/logic/reviews/review_bloc.dart';
import 'package:mobile_app/logic/reviews/review_event.dart';
import 'package:mobile_app/logic/reviews/review_state.dart';
import 'package:mobile_app/logic/wishlist/wishlist_bloc.dart';
import 'package:mobile_app/logic/wishlist/wishlist_event.dart';
import 'package:mobile_app/logic/wishlist/wishlist_state.dart';
import 'package:mobile_app/presentation/widgets/app_toast.dart';
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
    final id = widget.productId?.toString() ?? '';
    if (id.isEmpty || id == '0') {
      if (mounted) {
        setState(() {
          _errorMessage = 'Invalid Product Identifier ($id).';
          _isLoading = false;
        });
      }
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

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
    if (_activeStock <= 0) {
      AppToast.showInfo(context, 'This item is currently sold out.');
      return;
    }

    final effectiveQuantity = _quantity.clamp(1, _activeStock);

    context.read<CartBloc>().add(
          AddToCartEvent(
            productId: _product!.id,
            variantId: _selectedVariant?.id,
            quantity: effectiveQuantity,
            product: _product,
          ),
        );
    AppToast.showReserved(
      context,
      productName: _product!.name,
      quantity: effectiveQuantity,
    );
  }

  void _promptAuthRequired() {
    showModalBottomSheet(
      context: context,
      backgroundColor: C.overlay,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(C.radiusModal)),
        side: BorderSide(color: C.line, width: 1),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.lock_outline, color: C.amber, size: 24),
                const SizedBox(width: 8),
                Text(
                  'Authentication Required',
                  style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.bold, color: C.text),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Please sign in to share your product review.',
              style: GoogleFonts.manrope(fontSize: 13, color: C.textDim),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                context.push('/login');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: C.amber,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 44),
              ),
              child: const Text('LOG IN'),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              style: TextButton.styleFrom(
                foregroundColor: C.textMute,
              ),
              child: const Text('CANCEL'),
            ),
          ],
        ),
      ),
    );
  }

  void _showReviewBottomSheet() {
    final authState = context.read<AuthBloc>().state;
    if (authState is! Authenticated) {
      _promptAuthRequired();
      return;
    }

    final titleController = TextEditingController();
    final commentController = TextEditingController();
    int rating = 5;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: C.overlay,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(C.radiusModal)),
        side: BorderSide(color: C.line, width: 1),
      ),
      builder: (ctx) => BlocConsumer<ReviewBloc, ReviewState>(
        listener: (ctx, state) {
          if (state is ReviewSubmissionFailure) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: C.rose,
              ),
            );
          } else if (state is ReviewSubmissionSuccess) {
            setState(() {
              _reviews.insert(0, state.review);
            });
            AppToast.showSuccess(context, 'Review verified & published!');
            Navigator.pop(ctx);
          }
        },
        builder: (ctx, reviewState) {
          final isSubmitting = reviewState is ReviewSubmitting;

          return StatefulBuilder(
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
                        : () {
                            final curAuth = context.read<AuthBloc>().state;
                            if (curAuth is! Authenticated) {
                              Navigator.pop(ctx);
                              _promptAuthRequired();
                              return;
                            }
                            context.read<ReviewBloc>().add(
                                  SubmitReviewEvent(
                                    productId: widget.productId,
                                    rating: rating,
                                    title: titleController.text.trim().isNotEmpty
                                        ? titleController.text.trim()
                                        : null,
                                    comment: commentController.text.trim().isNotEmpty
                                        ? commentController.text.trim()
                                        : null,
                                  ),
                                );
                          },
                    child: isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(
                            'SUBMIT REVIEW',
                            style: GoogleFonts.manrope(fontWeight: FontWeight.bold),
                          ),
                  ),
                ],
              ),
            ),
          );
        },
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    ElevatedButton(
                      onPressed: () => context.pop(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: C.raised,
                        foregroundColor: C.text,
                      ),
                      child: const Text('BACK TO FLOOR'),
                    ),
                    const SizedBox(width: 10),
                    ElevatedButton(
                      onPressed: _loadProductData,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: C.amber,
                        foregroundColor: C.onAmber,
                      ),
                      child: const Text('RETRY'),
                    ),
                  ],
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

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);
    final secondaryTextColor = isDark ? C.darkTextDim : const Color(0xFF4B5563);
    final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);
    final amberColor = isDark ? C.darkAmber : C.lightAmber;
    final onAmberColor = isDark ? C.darkOnAmber : Colors.white;
    final cardBg = isDark ? C.darkSurface : Colors.white;
    final cardBorder = isDark ? C.darkLine : const Color(0xFFE5E7EB);
    final roseColor = isDark ? C.darkRose : C.lightRose;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: theme.scaffoldBackgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: primaryTextColor),
          onPressed: () => context.pop(),
        ),
        title: Text(
          product.name,
          style: GoogleFonts.sora(fontSize: 15, fontWeight: FontWeight.w700, color: primaryTextColor),
        ),
        actions: [
          // Wishlist Toggle
          BlocBuilder<WishlistBloc, WishlistState>(
            builder: (context, state) {
              bool isSaved = false;
              if (state is WishlistLoaded) {
                isSaved = state.items.any((i) => i.productId.toString() == product.id.toString());
              }

              return IconButton(
                icon: Icon(
                  isSaved ? Icons.favorite : Icons.favorite_border,
                  color: isSaved ? amberColor : secondaryTextColor,
                ),
                onPressed: () {
                  context.read<WishlistBloc>().add(ToggleWishlistEvent(product.id, product: product));
                  if (!isSaved) {
                    AppToast.showSuccess(context, 'SAVED: ${product.name}');
                  }
                },
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Gallery
            Stack(
              children: [
                AspectRatio(
                  aspectRatio: 1.15,
                  child: images.isNotEmpty
                      ? PageView.builder(
                          itemCount: images.length,
                          onPageChanged: (i) => setState(() => _selectedImageIndex = i),
                          itemBuilder: (context, index) => Image.network(
                            images[index],
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => Container(
                              color: isDark ? C.darkRaised : const Color(0xFFF3F4F6),
                              child: Icon(Icons.shopping_bag_outlined, color: muteTextColor, size: 48),
                            ),
                          ),
                        )
                      : Container(
                          color: isDark ? C.darkRaised : const Color(0xFFF3F4F6),
                          child: Icon(Icons.shopping_bag_outlined, color: muteTextColor, size: 48),
                        ),
                ),
                if (product.discountPercentage > 0)
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: amberColor,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '-${product.discountPercentage}% DROP',
                        style: GoogleFonts.jetBrainsMono(
                          color: onAmberColor,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                if (images.length > 1)
                  Positioned(
                    bottom: 12,
                    left: 0,
                    right: 0,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(images.length, (index) {
                        final isActive = index == _selectedImageIndex;
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          width: isActive ? 16 : 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: isActive ? amberColor : cardBorder,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        );
                      }),
                    ),
                  ),
              ],
            ),

            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category & Availability Badge
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      if (product.categoryName != null)
                        Text(
                          product.categoryName!.toUpperCase(),
                          style: GoogleFonts.jetBrainsMono(
                            color: amberColor,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                      if (_isSoldOut)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: roseColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(color: roseColor.withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            '• SOLD OUT',
                            style: GoogleFonts.jetBrainsMono(color: roseColor, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        )
                      else if (_activeStock <= 5)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: amberColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(color: amberColor.withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            'ONLY $_activeStock LEFT IN STOCK',
                            style: GoogleFonts.jetBrainsMono(color: amberColor, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        )
                      else
                        Text(
                          '• IN STOCK',
                          style: GoogleFonts.jetBrainsMono(color: isDark ? C.darkMint : C.lightMint, fontSize: 10, fontWeight: FontWeight.bold),
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
                      color: primaryTextColor,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Price
                  PriceText(
                    amount: _activePrice,
                    originalAmount: product.discountPercentage > 0 ? product.price : null,
                    size: PriceTextSize.xl,
                    color: primaryTextColor,
                  ),
                  const SizedBox(height: 12),

                  // Conditional Scarcity Alert (Urgency Mode: Only when stock <= 5 and > 0)
                  if (_activeStock > 0 && _activeStock <= 5) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: amberColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(C.radiusCard),
                        border: Border.all(color: amberColor.withValues(alpha: 0.3)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.bolt, size: 14, color: amberColor),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  'Only $_activeStock left in stock - order soon!',
                                  style: GoogleFonts.jetBrainsMono(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: amberColor,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          StockProgressBar(
                            stock: _activeStock,
                            initialStock: 10,
                            variant: StockBarVariant.continuous,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Variants Picker
                  if (_variants.isNotEmpty) ...[
                    Text(
                      'SPECIFICATION OPTIONS',
                      style: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.bold, color: muteTextColor),
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
                          key: ValueKey('variant_${v.id}'),
                          label: Text(displayLabel),
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
                            setState(() {
                              _selectedVariant = v;
                              if (_quantity > v.stock && v.stock > 0) {
                                _quantity = v.stock;
                              } else if (v.stock <= 0) {
                                _quantity = 1;
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
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (context, i) {
                        final r = _reviews[i];
                        return Container(
                          key: ValueKey('review_${r.id}'),
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
        decoration: BoxDecoration(
          color: cardBg,
          border: Border(top: BorderSide(color: cardBorder, width: 1)),
        ),
        child: SafeArea(
          child: Row(
            children: [
              // Hide increment controls if sold out
              if (!_isSoldOut) ...[
                Container(
                  decoration: BoxDecoration(
                    color: isDark ? C.darkRaised : const Color(0xFFF3F4F6),
                    borderRadius: BorderRadius.circular(C.radiusPill),
                    border: Border.all(color: cardBorder),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        icon: Icon(Icons.remove, size: 16, color: secondaryTextColor),
                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                        padding: EdgeInsets.zero,
                        onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                      ),
                      Text(
                        '$_quantity',
                        style: GoogleFonts.jetBrainsMono(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: primaryTextColor,
                          fontFeatures: [const FontFeature.tabularFigures()],
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.add, size: 16, color: secondaryTextColor),
                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                        padding: EdgeInsets.zero,
                        onPressed: () {
                          if (_quantity < _activeStock) {
                            setState(() => _quantity++);
                          } else {
                            AppToast.showInfo(
                              context,
                              'Maximum available stock reached ($_activeStock available)',
                            );
                          }
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
              ],

              // Add to Cart / Sold Out Button
              Expanded(
                child: ElevatedButton(
                  onPressed: _isSoldOut ? null : _onAddToCart,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: amberColor,
                    foregroundColor: onAmberColor,
                    disabledBackgroundColor: isDark ? C.darkRaised : const Color(0xFFF3F4F6),
                    disabledForegroundColor: muteTextColor,
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
