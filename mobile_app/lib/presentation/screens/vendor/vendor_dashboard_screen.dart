import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/data/repositories/vendor_repository.dart';
import 'package:mobile_app/presentation/widgets/price_text.dart';
import 'package:mobile_app/presentation/widgets/status_pill_widget.dart';

class VendorDashboardScreen extends StatefulWidget {
  const VendorDashboardScreen({super.key});

  @override
  State<VendorDashboardScreen> createState() => _VendorDashboardScreenState();
}

class _VendorDashboardScreenState extends State<VendorDashboardScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final VendorRepository _vendorRepo = VendorRepository();

  Map<String, dynamic>? _profile;
  Map<String, dynamic>? _finance;
  List<dynamic> _products = [];
  List<dynamic> _subOrders = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAllVendorData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAllVendorData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final futures = await Future.wait([
        _vendorRepo.getVendorProfile().catchError((_) => <String, dynamic>{}),
        _vendorRepo.getVendorFinance().catchError((_) => <String, dynamic>{}),
        _vendorRepo.getVendorProducts().catchError((_) => <dynamic>[]),
        _vendorRepo.getVendorSubOrders().catchError((_) => <dynamic>[]),
      ]);

      if (mounted) {
        setState(() {
          _profile = futures[0] as Map<String, dynamic>;
          _finance = futures[1] as Map<String, dynamic>;
          _products = futures[2] as List<dynamic>;
          _subOrders = futures[3] as List<dynamic>;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _showAddProductDialog() {
    final nameCtrl = TextEditingController();
    final skuCtrl = TextEditingController();
    final priceCtrl = TextEditingController(text: '49.99');
    final stockCtrl = TextEditingController(text: '50');
    final descCtrl = TextEditingController();
    bool isSaving = false;

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
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'List New SKU Lot',
                      style: GoogleFonts.sora(fontSize: 17, fontWeight: FontWeight.bold, color: C.text),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20, color: C.textMute),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Product Name')),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: TextField(controller: skuCtrl, decoration: const InputDecoration(labelText: 'SKU Code'))),
                    const SizedBox(width: 8),
                    Expanded(child: TextField(controller: priceCtrl, decoration: const InputDecoration(labelText: 'Price (\$)'))),
                    const SizedBox(width: 8),
                    Expanded(child: TextField(controller: stockCtrl, decoration: const InputDecoration(labelText: 'Stock Units'))),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(controller: descCtrl, maxLines: 2, decoration: const InputDecoration(labelText: 'Description / Specs')),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: isSaving
                      ? null
                      : () async {
                          if (nameCtrl.text.trim().isEmpty) return;
                          setSheetState(() => isSaving = true);
                          try {
                            await _vendorRepo.createVendorProduct({
                              'name': nameCtrl.text.trim(),
                              'sku': skuCtrl.text.trim().isNotEmpty ? skuCtrl.text.trim() : 'SKU-${DateTime.now().millisecondsSinceEpoch}',
                              'price': double.tryParse(priceCtrl.text) ?? 49.99,
                              'stock': int.tryParse(stockCtrl.text) ?? 50,
                              'description': descCtrl.text.trim(),
                            });
                            Navigator.pop(ctx);
                            _loadAllVendorData();
                          } catch (e) {
                            setSheetState(() => isSaving = false);
                          }
                        },
                  style: ElevatedButton.styleFrom(backgroundColor: C.violet, foregroundColor: C.onViolet),
                  child: Text(
                    isSaving ? 'LISTING...' : 'CONFIRM SKU DROP',
                    style: GoogleFonts.manrope(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),
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
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: C.violetSoft,
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: C.violet.withValues(alpha: 0.4)),
              ),
              child: Text(
                'MERCHANT',
                style: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.bold, color: C.violet),
              ),
            ),
            const SizedBox(width: 8),
            Text(
              _profile?['store_name'] ?? 'Control Floor',
              style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: C.text),
            ),
          ],
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: C.text),
          onPressed: () => context.pop(),
        ),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: C.violet,
          labelColor: C.violet,
          unselectedLabelColor: C.textMute,
          labelStyle: GoogleFonts.jetBrainsMono(fontSize: 11, fontWeight: FontWeight.bold),
          tabs: const [
            Tab(text: 'SUB-ORDERS'),
            Tab(text: 'SKU LOTS'),
            Tab(text: 'FINANCE'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: C.violet))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 44, color: C.rose),
                        const SizedBox(height: 12),
                        Text(_error!, textAlign: TextAlign.center, style: GoogleFonts.manrope(color: C.textMute)),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loadAllVendorData,
                          style: ElevatedButton.styleFrom(backgroundColor: C.violet, foregroundColor: C.onViolet),
                          child: const Text('RETRY'),
                        ),
                      ],
                    ),
                  ),
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildSubOrdersTab(),
                    _buildProductsTab(),
                    _buildFinanceTab(),
                  ],
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddProductDialog,
        backgroundColor: C.violet,
        foregroundColor: C.onViolet,
        icon: const Icon(Icons.add),
        label: Text('NEW SKU LOT', style: GoogleFonts.jetBrainsMono(fontWeight: FontWeight.bold, fontSize: 11)),
      ),
    );
  }

  String _formatSubOrderId(dynamic rawId) {
    final str = rawId?.toString() ?? '';
    if (str.isEmpty) return 'SUB-UNKNOWN';
    final clean = str.startsWith('SUB-') ? str.substring(4) : str;
    if (clean.length <= 12) return 'SUB-$clean';
    return 'SUB-${clean.substring(0, 8)}...${clean.substring(clean.length - 4)}';
  }

  Widget _buildSubOrdersTab() {
    if (_subOrders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.inventory_2_outlined, size: 48, color: C.textMute),
            const SizedBox(height: 12),
            Text('NO SUB-ORDERS PENDING', style: GoogleFonts.jetBrainsMono(fontSize: 13, fontWeight: FontWeight.bold, color: C.textDim)),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _subOrders.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, i) {
        final order = _subOrders[i];
        final rawId = order['id'] ?? '00$i';
        final displayId = _formatSubOrderId(rawId);
        final status = (order['status'] ?? 'PENDING').toString();
        final total = (order['total_amount'] is num) ? (order['total_amount'] as num).toDouble() : 0.0;
        final isEven = i % 2 == 0;

        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isEven ? C.surface : C.raised,
            borderRadius: BorderRadius.circular(C.radiusCard),
            border: Border.all(color: C.line),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Semantic Status Indicator Strip
              Container(
                width: 3,
                height: 36,
                decoration: BoxDecoration(
                  color: status.toUpperCase() == 'DELIVERED' || status.toUpperCase() == 'PAID'
                      ? C.mint
                      : (status.toUpperCase() == 'CANCELLED' ? C.rose : C.amber),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 12),

              // Sub-order ID & Status Pill wrapped in Expanded to prevent overflow
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      displayId,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: C.text,
                      ),
                    ),
                    const SizedBox(height: 5),
                    StatusPillWidget(status: status),
                  ],
                ),
              ),
              const SizedBox(width: 12),

              PriceText(amount: total, size: PriceTextSize.md),
            ],
          ),
        );
      },
    );
  }

  Widget _buildProductsTab() {
    if (_products.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.shelves, size: 48, color: C.textMute),
            const SizedBox(height: 12),
            Text('NO SKU LOTS REGISTERED', style: GoogleFonts.jetBrainsMono(fontSize: 13, fontWeight: FontWeight.bold, color: C.textDim)),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _products.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, i) {
        final p = _products[i];
        final name = p['name'] ?? 'SKU Item';
        final sku = p['sku'] ?? 'FSE-LOT';
        final price = (p['price'] is num) ? (p['price'] as num).toDouble() : 0.0;
        final stock = p['available_stock'] ?? p['stock'] ?? 0;
        final isEven = i % 2 == 0;

        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isEven ? C.surface : C.raised,
            borderRadius: BorderRadius.circular(C.radiusCard),
            border: Border.all(color: C.line),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.manrope(fontSize: 13, fontWeight: FontWeight.bold, color: C.text),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'SKU: $sku · $stock UNITS HELD',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.jetBrainsMono(fontSize: 10, color: C.textMute),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              PriceText(amount: price, size: PriceTextSize.sm),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFinanceTab() {
    final balance = (_finance?['available_balance'] is num) ? (_finance!['available_balance'] as num).toDouble() : 0.0;
    final escrow = (_finance?['escrow_balance'] is num) ? (_finance!['escrow_balance'] as num).toDouble() : 0.0;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: C.surface,
            borderRadius: BorderRadius.circular(C.radiusCard),
            border: Border.all(color: C.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('SETTLED COMMODITY BALANCE', style: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.bold, color: C.textMute)),
              const SizedBox(height: 6),
              PriceText(amount: balance, size: PriceTextSize.xl, color: C.mint),
              const Divider(color: C.line, height: 24),
              Text('ESCROW HOLD BALANCE', style: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.bold, color: C.textMute)),
              const SizedBox(height: 6),
              PriceText(amount: escrow, size: PriceTextSize.lg, color: C.amber),
            ],
          ),
        ),
      ],
    );
  }
}
