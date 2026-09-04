import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/logic/products/product_bloc.dart';
import 'package:mobile_app/logic/products/product_state.dart';

class MarqueeTickerWidget extends StatefulWidget implements PreferredSizeWidget {
  final List<ProductModel>? products;
  final VoidCallback? onDismiss;

  const MarqueeTickerWidget({super.key, this.products, this.onDismiss});

  @override
  Size get preferredSize => const Size.fromHeight(26);

  @override
  State<MarqueeTickerWidget> createState() => _MarqueeTickerWidgetState();
}

class _MarqueeTickerWidgetState extends State<MarqueeTickerWidget> {
  late final ScrollController _scrollController;
  Timer? _timer;
  bool _isDisposed = false;
  bool _isDismissed = false;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    WidgetsBinding.instance.addPostFrameCallback((_) => _startScrolling());
  }

  void _startScrolling() {
    if (_isDisposed) return;
    _timer = Timer.periodic(const Duration(milliseconds: 30), (timer) {
      if (!_scrollController.hasClients || _isDisposed) return;

      final maxScroll = _scrollController.position.maxScrollExtent;
      final currentScroll = _scrollController.offset;
      const step = 1.0;

      if (currentScroll >= maxScroll) {
        _scrollController.jumpTo(0);
      } else {
        _scrollController.jumpTo(currentScroll + step);
      }
    });
  }

  @override
  void dispose() {
    _isDisposed = true;
    _timer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  List<String> _buildTickerItems(List<ProductModel>? productsList) {
    final list = widget.products ?? productsList;
    if (list != null && list.isNotEmpty) {
      final items = <String>[];
      for (final p in list) {
        final name = p.name;
        final price = '\$${p.currentPrice.toStringAsFixed(2)}';
        if (p.isSoldOut) {
          items.add('Sold out: $name');
        } else if (p.discountPercentage > 0) {
          items.add('Deal: $name — ${p.discountPercentage}% off ($price) · ${p.stock} left');
        } else if (p.stock <= 15) {
          items.add('Low stock: $name — only ${p.stock} left ($price)');
        } else {
          items.add('$name · $price');
        }
      }
      if (items.isNotEmpty) return items;
    }

    return const [
      'Flash deals live now',
      'Items held in cart for 10 minutes',
      'Fast direct shipping',
      'Free returns on all orders',
    ];
  }

  @override
  Widget build(BuildContext context) {
    if (_isDismissed) {
      return const SizedBox.shrink();
    }

    return BlocBuilder<ProductBloc, ProductState>(
      builder: (context, state) {
        List<ProductModel>? liveProducts;
        if (state is ProductLoaded) {
          liveProducts = state.products;
        }

        final tickerItems = _buildTickerItems(liveProducts);
        final fullText = '${tickerItems.join('   •   ')}   •   ';

        final isDark = Theme.of(context).brightness == Brightness.dark;
        final amberColor = isDark ? C.darkAmber : C.lightAmber;
        final lineColor = isDark ? C.darkLine : const Color(0xFFE2DED5);
        final muteTextColor = isDark ? C.darkTextMute : const Color(0xFF6B7280);

        return Container(
          height: 26,
          decoration: BoxDecoration(
            color: isDark ? C.darkRaised : const Color(0xFFF7F6F3),
            border: Border(
              bottom: BorderSide(color: lineColor.withValues(alpha: 0.7), width: 0.5),
            ),
          ),
          child: Row(
            children: [
              // Slim Live Indicator
              Padding(
                padding: const EdgeInsets.only(left: 10, right: 6),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
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
                      'Live',
                      style: GoogleFonts.manrope(
                        color: amberColor,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),

              // Continuous Marquee Strip
              Expanded(
                child: ListView.builder(
                  controller: _scrollController,
                  scrollDirection: Axis.horizontal,
                  physics: const NeverScrollableScrollPhysics(),
                  itemBuilder: (context, index) {
                    return Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 6),
                        child: Text(
                          fullText,
                          style: GoogleFonts.manrope(
                            fontSize: 10,
                            color: isDark ? C.darkTextDim : const Color(0xFF4B5563),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),

              // Dismiss Icon
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  setState(() => _isDismissed = true);
                  widget.onDismiss?.call();
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Icon(Icons.close, size: 12, color: muteTextColor),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
