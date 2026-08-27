import 'package:equatable/equatable.dart';
import 'package:mobile_app/data/models/product_model.dart';

class CartItemModel extends Equatable {
  final int id;
  final int productId;
  final String productName;
  final double unitPrice;
  final int quantity;
  final double subtotal;
  final String? imageUrl;
  final ProductModel? product;

  const CartItemModel({
    required this.id,
    required this.productId,
    required this.productName,
    required this.unitPrice,
    required this.quantity,
    required this.subtotal,
    this.imageUrl,
    this.product,
  });

  factory CartItemModel.fromJson(Map<String, dynamic> json) {
    final productData = json['product'] as Map<String, dynamic>?;
    return CartItemModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      productId: json['product_id'] is int ? json['product_id'] : int.tryParse(json['product_id']?.toString() ?? '0') ?? 0,
      productName: json['product_name'] as String? ?? (productData != null ? productData['name'] : '') ?? '',
      unitPrice: (json['unit_price'] is num)
          ? (json['unit_price'] as num).toDouble()
          : double.tryParse(json['unit_price']?.toString() ?? '0.0') ?? 0.0,
      quantity: json['quantity'] is int ? json['quantity'] : int.tryParse(json['quantity']?.toString() ?? '1') ?? 1,
      subtotal: (json['subtotal'] is num)
          ? (json['subtotal'] as num).toDouble()
          : double.tryParse(json['subtotal']?.toString() ?? '0.0') ?? 0.0,
      imageUrl: json['image_url'] as String? ?? (productData != null ? productData['image_url'] : null),
      product: productData != null ? ProductModel.fromJson(productData) : null,
    );
  }

  @override
  List<Object?> get props => [id, productId, productName, unitPrice, quantity, subtotal, imageUrl, product];
}

class CartSummaryModel extends Equatable {
  final List<CartItemModel> items;
  final double subtotal;
  final int itemCount;

  const CartSummaryModel({
    this.items = const [],
    this.subtotal = 0.0,
    this.itemCount = 0,
  });

  factory CartSummaryModel.fromJson(Map<String, dynamic> json) {
    final itemsList = (json['items'] as List<dynamic>?)
            ?.map((e) => CartItemModel.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];
    return CartSummaryModel(
      items: itemsList,
      subtotal: (json['subtotal'] is num)
          ? (json['subtotal'] as num).toDouble()
          : double.tryParse(json['subtotal']?.toString() ?? '0.0') ?? 0.0,
      itemCount: json['item_count'] is int ? json['item_count'] : (json['total_items'] is int ? json['total_items'] : itemsList.length),
    );
  }

  @override
  List<Object?> get props => [items, subtotal, itemCount];
}
