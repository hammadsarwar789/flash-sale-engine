import 'package:equatable/equatable.dart';

class VariantModel extends Equatable {
  final String id;
  final String sku;
  final String? name;
  final String? size;
  final String? color;
  final double price;
  final int stock;

  const VariantModel({
    required this.id,
    required this.sku,
    this.name,
    this.size,
    this.color,
    required this.price,
    this.stock = 0,
  });

  factory VariantModel.fromJson(Map<String, dynamic> json) {
    final stockVal = json['available_stock'] ?? json['stock'] ?? 0;
    return VariantModel(
      id: json['id']?.toString() ?? '',
      sku: json['sku'] as String? ?? '',
      name: json['name'] as String?,
      size: json['size'] as String?,
      color: json['color'] as String?,
      price: (json['price'] is num)
          ? (json['price'] as num).toDouble()
          : double.tryParse(json['price']?.toString() ?? '0.0') ?? 0.0,
      stock: stockVal is int ? stockVal : int.tryParse(stockVal.toString()) ?? 0,
    );
  }

  @override
  List<Object?> get props => [id, sku, name, size, color, price, stock];
}

class ReviewModel extends Equatable {
  final String id;
  final int rating;
  final String? title;
  final String? comment;
  final String? userName;
  final String? createdAt;

  const ReviewModel({
    required this.id,
    required this.rating,
    this.title,
    this.comment,
    this.userName,
    this.createdAt,
  });

  factory ReviewModel.fromJson(Map<String, dynamic> json) {
    return ReviewModel(
      id: json['id']?.toString() ?? '',
      rating: json['rating'] is int
          ? json['rating']
          : int.tryParse(json['rating']?.toString() ?? '5') ?? 5,
      title: json['title'] as String?,
      comment: json['comment'] as String?,
      userName: json['user_name'] as String? ?? json['user']?['full_name'] as String? ?? 'Shopper',
      createdAt: json['created_at'] as String?,
    );
  }

  @override
  List<Object?> get props => [id, rating, title, comment, userName, createdAt];
}

class ProductModel extends Equatable {
  final int id;
  final String name;
  final String? sku;
  final String? description;
  final double price;
  final double? salePrice;
  final int stock;
  final int initialStock;
  final bool isFlashSale;
  final String? flashSaleStart;
  final String? flashSaleEnd;
  final String? imageUrl;
  final List<String> images;
  final int? categoryId;
  final String? categoryName;
  final String? sellerName;
  final bool isActive;
  final List<VariantModel> variants;

  const ProductModel({
    required this.id,
    required this.name,
    this.sku,
    this.description,
    required this.price,
    this.salePrice,
    required this.stock,
    this.initialStock = 100,
    this.isFlashSale = false,
    this.flashSaleStart,
    this.flashSaleEnd,
    this.imageUrl,
    this.images = const [],
    this.categoryId,
    this.categoryName,
    this.sellerName,
    this.isActive = true,
    this.variants = const [],
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
    // Backend sends 'available_stock' / 'total_stock'; fall back to 'stock' / 'initial_stock'
    final stockValue = json['available_stock'] ?? json['stock'];
    final initialStockValue = json['total_stock'] ?? json['initial_stock'] ?? stockValue;

    // Backend sends 'discount_percentage' instead of 'is_flash_sale' boolean
    final discountPct = (json['discount_percentage'] is num)
        ? (json['discount_percentage'] as num).toDouble()
        : double.tryParse(json['discount_percentage']?.toString() ?? '0') ?? 0.0;
    final isFlash = json['is_flash_sale'] as bool? ?? (discountPct > 0);

    // Extract images list
    List<String> imageList = [];
    if (json['images'] is List && (json['images'] as List).isNotEmpty) {
      imageList = (json['images'] as List).map((e) => e.toString()).toList();
    }

    String? imageUrl = json['image_url'] as String?;
    if ((imageUrl == null || imageUrl.isEmpty) && imageList.isNotEmpty) {
      imageUrl = imageList.first;
    }

    // Extract variants
    List<VariantModel> varList = [];
    if (json['variants'] is List && (json['variants'] as List).isNotEmpty) {
      varList = (json['variants'] as List)
          .map((v) => VariantModel.fromJson(v as Map<String, dynamic>))
          .toList();
    }

    return ProductModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      name: json['name'] as String? ?? '',
      sku: json['sku'] as String?,
      description: json['description'] as String?,
      price: (json['price'] is num)
          ? (json['price'] as num).toDouble()
          : double.tryParse(json['price']?.toString() ?? '0.0') ?? 0.0,
      salePrice: json['sale_price'] != null
          ? ((json['sale_price'] is num)
              ? (json['sale_price'] as num).toDouble()
              : double.tryParse(json['sale_price']?.toString() ?? ''))
          : null,
      stock: stockValue is int ? stockValue : int.tryParse(stockValue?.toString() ?? '0') ?? 0,
      initialStock: initialStockValue is int
          ? initialStockValue
          : int.tryParse(initialStockValue?.toString() ?? '100') ?? 100,
      isFlashSale: isFlash,
      flashSaleStart: json['flash_sale_start'] as String?,
      flashSaleEnd: json['flash_sale_end'] as String?,
      imageUrl: imageUrl,
      images: imageList,
      categoryId: json['category_id'] is int
          ? json['category_id']
          : int.tryParse(json['category_id']?.toString() ?? ''),
      categoryName: json['category_name'] as String? ??
          (json['category'] is Map ? json['category']['name'] : null),
      sellerName: json['seller_name'] as String? ??
          (json['seller'] is Map ? json['seller']['store_name'] : null),
      isActive: json['is_active'] as bool? ?? true,
      variants: varList,
    );
  }

  @override
  List<Object?> get props => [
        id,
        name,
        sku,
        description,
        price,
        salePrice,
        stock,
        initialStock,
        isFlashSale,
        flashSaleStart,
        flashSaleEnd,
        imageUrl,
        images,
        categoryId,
        categoryName,
        sellerName,
        isActive,
        variants,
      ];
}

class PaginatedProducts extends Equatable {
  final List<ProductModel> items;
  final int total;
  final int page;
  final int pages;
  final int perPage;

  const PaginatedProducts({
    required this.items,
    this.total = 0,
    this.page = 1,
    this.pages = 1,
    this.perPage = 20,
  });

  factory PaginatedProducts.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] ?? json['products'] ?? [];
    final List<ProductModel> itemsList = (rawItems is List)
        ? rawItems.map((e) => ProductModel.fromJson(e as Map<String, dynamic>)).toList()
        : [];

    return PaginatedProducts(
      items: itemsList,
      total: json['total'] is int
          ? json['total']
          : int.tryParse(json['total']?.toString() ?? '0') ?? itemsList.length,
      page: json['page'] is int
          ? json['page']
          : int.tryParse(json['page']?.toString() ?? '1') ?? 1,
      pages: json['pages'] is int
          ? json['pages']
          : int.tryParse(json['pages']?.toString() ?? '1') ?? 1,
      perPage: json['per_page'] is int
          ? json['per_page']
          : int.tryParse(json['per_page']?.toString() ?? '20') ?? 20,
    );
  }

  @override
  List<Object?> get props => [items, total, page, pages, perPage];
}
