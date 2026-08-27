import 'package:equatable/equatable.dart';

class ProductModel extends Equatable {
  final int id;
  final String name;
  final String? description;
  final double price;
  final double? salePrice;
  final int stock;
  final int initialStock;
  final bool isFlashSale;
  final String? flashSaleStart;
  final String? flashSaleEnd;
  final String? imageUrl;
  final int? categoryId;
  final String? categoryName;
  final bool isActive;

  const ProductModel({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    this.salePrice,
    required this.stock,
    this.initialStock = 100,
    this.isFlashSale = false,
    this.flashSaleStart,
    this.flashSaleEnd,
    this.imageUrl,
    this.categoryId,
    this.categoryName,
    this.isActive = true,
  });

  double get currentPrice => (isFlashSale && salePrice != null) ? salePrice! : price;

  int get discountPercentage {
    if (isFlashSale && salePrice != null && price > 0) {
      return (((price - salePrice!) / price) * 100).round();
    }
    return 0;
  }

  double get stockPercentage {
    final maxStock = initialStock > 0 ? initialStock : 100;
    return (stock / maxStock).clamp(0.0, 1.0);
  }

  bool get isSoldOut => stock <= 0;

  factory ProductModel.fromJson(Map<String, dynamic> json) {
    return ProductModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      price: (json['price'] is num) ? (json['price'] as num).toDouble() : double.tryParse(json['price']?.toString() ?? '0.0') ?? 0.0,
      salePrice: json['sale_price'] != null ? ((json['sale_price'] is num) ? (json['sale_price'] as num).toDouble() : double.tryParse(json['sale_price']?.toString() ?? '')) : null,
      stock: json['stock'] is int ? json['stock'] : int.tryParse(json['stock']?.toString() ?? '0') ?? 0,
      initialStock: json['initial_stock'] is int ? json['initial_stock'] : (json['stock'] is int ? json['stock'] : 100),
      isFlashSale: json['is_flash_sale'] as bool? ?? false,
      flashSaleStart: json['flash_sale_start'] as String?,
      flashSaleEnd: json['flash_sale_end'] as String?,
      imageUrl: json['image_url'] as String?,
      categoryId: json['category_id'] is int ? json['category_id'] : int.tryParse(json['category_id']?.toString() ?? ''),
      categoryName: json['category_name'] as String? ?? (json['category'] is Map ? json['category']['name'] : null),
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        description,
        price,
        salePrice,
        stock,
        initialStock,
        isFlashSale,
        flashSaleStart,
        flashSaleEnd,
        imageUrl,
        categoryId,
        categoryName,
        isActive,
      ];
}
