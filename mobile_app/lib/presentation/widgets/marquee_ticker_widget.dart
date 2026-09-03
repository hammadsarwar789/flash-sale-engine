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

  const MarqueeTickerWidget({super.key, this.products});

  @override
  Size get preferredSize => const Size.fromHeight(32);

  @override
  State<MarqueeTickerWidget> createState() => _MarqueeTickerWidgetState();
}

class _MarqueeTickerWidgetState extends State<MarqueeTickerWidget> {
  late final ScrollController _scrollController;
  Timer? _timer;
  bool _isDisposed = false;

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
        final name = p.name.toUpperCase();
        final price = '\$${p.currentPrice.toStringAsFixed(2)}';
        if (p.isSoldOut) {
          items.add('SOLD OUT: $name');
        } else if (p.discountPercentage > 0) {
          items.add('DROP: $name — ${p.discountPercentage}% OFF ($price) · ${p.stock} LEFT');
        } else if (p.stock <= 15) {
          items.add('▲ SCARCITY: $name — ONLY ${p.stock} LEFT ($price)');
        } else {
          items.add('LIVE: $name · $price (${p.stock} IN STOCK)');
        }
      }
      if (items.isNotEmpty) return items;
    }

    return const [
      'FLASH SALE ENGINE LIVE',
      '10:00 MIN RESERVATION TIMERS',
      'ORDERS/MIN: 428',
      'DIRECT WAREHOUSE ALLOCATION',
      'SETTLEMENT: STRIPE WEBHOOK ACTIVE',
      'NEXT HIGH-VELOCITY DROP IN 00:14:22',
    ];
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ProductBloc, ProductState>(
      builder: (context, state) {
        List<ProductModel>? liveProducts;
        if (state is ProductLoaded) {
          liveProducts = state.products;
        }

        final tickerItems = _buildTickerItems(liveProducts);
        final fullText = '${tickerItems.join('   ●   ')}   ●   ';

        final isDark = Theme.of(context).brightness == Brightness.dark;
        final amberColor = isDark ? C.darkAmber : C.lightAmber;
        final lineColor = isDark ? C.darkLine : const Color(0xFFE2DED5);

        return Container(
          height: 32,
          decoration: BoxDecoration(
            color: isDark ? C.darkRaised : const Color(0xFFF1EFEA),
            border: Border(
              top: BorderSide(color: lineColor, width: 1),
              bottom: BorderSide(color: lineColor, width: 1),
            ),
          ),
          child: Row(
            children: [
              // Static Live Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                height: double.infinity,
                decoration: BoxDecoration(
                  color: isDark ? C.darkSurface : Colors.white,
                  border: Border(right: BorderSide(color: lineColor, width: 1)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        color: amberColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'LIVE',
                      style: GoogleFonts.jetBrainsMono(
                        color: amberColor,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.0,
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
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Text(
                          fullText,
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 10,
                            color: isDark ? C.darkTextDim : const Color(0xFF4B5563),
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
