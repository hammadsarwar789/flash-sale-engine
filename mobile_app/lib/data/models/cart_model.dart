import 'package:equatable/equatable.dart';
import 'package:mobile_app/data/models/product_model.dart';

class CartItemModel extends Equatable {
  final dynamic id;
  final dynamic productId;
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
    final rawId = json['id'] ?? '0';
    final rawProdId = json['product_id'] ?? (productData != null ? productData['id'] : '0') ?? '0';

    return CartItemModel(
      id: (rawId is int) ? rawId : (int.tryParse(rawId.toString()) ?? rawId.toString()),
      productId: (rawProdId is int) ? rawProdId : (int.tryParse(rawProdId.toString()) ?? rawProdId.toString()),
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

class CouponValidationModel extends Equatable {
  final bool valid;
  final String code;
  final String discountType;
  final double discountValue;
  final double calculatedDiscount;
  final String message;

  const CouponValidationModel({
    required this.valid,
    required this.code,
    this.discountType = 'fixed',
    this.discountValue = 0.0,
    this.calculatedDiscount = 0.0,
    this.message = '',
  });

  factory CouponValidationModel.fromJson(Map<String, dynamic> json) {
    return CouponValidationModel(
      valid: json['valid'] as bool? ?? false,
      code: json['code'] as String? ?? '',
      discountType: json['discount_type'] as String? ?? 'fixed',
      discountValue: (json['discount_value'] is num)
          ? (json['discount_value'] as num).toDouble()
          : double.tryParse(json['discount_value']?.toString() ?? '0.0') ?? 0.0,
      calculatedDiscount: (json['calculated_discount'] is num)
          ? (json['calculated_discount'] as num).toDouble()
          : double.tryParse(json['calculated_discount']?.toString() ?? '0.0') ?? 0.0,
      message: json['message'] as String? ?? '',
    );
  }

  @override
  List<Object?> get props => [valid, code, discountType, discountValue, calculatedDiscount, message];
}

class ShippingAddressModel extends Equatable {
  final String id;
  final String recipientName;
  final String addressLine1;
  final String city;
  final String state;
  final String postalCode;
  final String country;
  final String phone;
  final bool isDefault;

  const ShippingAddressModel({
    required this.id,
    required this.recipientName,
    required this.addressLine1,
    required this.city,
    required this.state,
    required this.postalCode,
    this.country = 'UNITED STATES',
    this.phone = '',
    this.isDefault = false,
  });

  factory ShippingAddressModel.fromJson(Map<String, dynamic> json) {
    return ShippingAddressModel(
      id: json['id']?.toString() ?? '',
      recipientName: json['recipient_name'] as String? ?? '',
      addressLine1: json['address_line1'] as String? ?? '',
      city: json['city'] as String? ?? '',
      state: json['state'] as String? ?? '',
      postalCode: json['postal_code'] as String? ?? '',
      country: json['country'] as String? ?? 'UNITED STATES',
      phone: json['phone'] as String? ?? '',
      isDefault: json['is_default'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'recipient_name': recipientName,
        'address_line1': addressLine1,
        'city': city,
        'state': state,
        'postal_code': postalCode,
        'country': country,
        'phone': phone,
        'is_default': isDefault,
      };

  @override
  List<Object?> get props => [
        id,
        recipientName,
        addressLine1,
        city,
        state,
        postalCode,
        country,
        phone,
        isDefault,
      ];
}
