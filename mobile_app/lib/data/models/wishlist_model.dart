import 'package:equatable/equatable.dart';
import 'package:mobile_app/data/models/product_model.dart';

class WishlistItemModel extends Equatable {
  final String id;
  final dynamic productId;
  final String? createdAt;
  final ProductModel? product;

  const WishlistItemModel({
    required this.id,
    required this.productId,
    this.createdAt,
    this.product,
  });

  factory WishlistItemModel.fromJson(Map<String, dynamic> json) {
    final productData = json['product'] as Map<String, dynamic>?;
    return WishlistItemModel(
      id: json['id']?.toString() ?? '',
      productId: json['product_id'] is int
          ? json['product_id']
          : int.tryParse(json['product_id']?.toString() ?? '') ?? json['product_id']?.toString() ?? '',
      createdAt: json['created_at'] as String?,
      product: productData != null ? ProductModel.fromJson(productData) : null,
    );
  }

  @override
  List<Object?> get props => [id, productId, createdAt, product];
}
