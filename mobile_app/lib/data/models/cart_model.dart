import 'package:equatable/equatable.dart';
import 'package:mobile_app/data/models/product_model.dart';

class CartItemModel extends Equatable {
  final dynamic id;
  final dynamic productId;
  final dynamic variantId;
  final String productName;
  final String? variantName;
  final String? variantSku;
  final double unitPrice;
  final int quantity;
  final double subtotal;
  final String? imageUrl;
  final DateTime? expiresAt;
  final ProductModel? product;

  const CartItemModel({
    required this.id,
    required this.productId,
    this.variantId,
    required this.productName,
    this.variantName,
    this.variantSku,
    required this.unitPrice,
    required this.quantity,
    required this.subtotal,
    this.imageUrl,
    this.expiresAt,
    this.product,
  });

  int get availableStock {
    if (product != null) {
      if (variantId != null && product!.variants.isNotEmpty) {
        final v = product!.variants.where((v) => v.id.toString() == variantId.toString()).firstOrNull;
        if (v != null) return v.stock;
      }
      return product!.stock;
    }
    return 99;
  }

  bool get isLowStock => availableStock > 0 && availableStock <= 5;

  factory CartItemModel.fromJson(Map<String, dynamic> json) {
    final dynamic rawProduct = json['product'];
    final productData = (rawProduct is Map) ? Map<String, dynamic>.from(rawProduct) : null;
    final rawId = json['id'] ?? json['item_id'] ?? '0';
    final rawProdId = json['product_id'] ?? (productData != null ? productData['id'] : '0') ?? '0';
    final rawVariantId = json['variant_id'] ?? (productData != null ? productData['variant_id'] : null);

    // Extract product name from flat or nested structure
    final name = (json['product_name']?.toString() ??
            json['name']?.toString() ??
            json['title']?.toString() ??
            productData?['name']?.toString() ??
            'Flash Item')
        .trim();

    // Extract price
    final rawPrice = json['unit_price'] ?? json['price'] ?? productData?['price'];
    final parsedPrice = (rawPrice is num)
        ? rawPrice.toDouble()
        : double.tryParse(rawPrice?.toString() ?? '0.0') ?? 0.0;

    // Extract quantity
    final rawQty = json['quantity'] ?? json['qty'] ?? 1;
    final parsedQty = rawQty is int ? rawQty : int.tryParse(rawQty?.toString() ?? '1') ?? 1;

    // Extract subtotal
    final rawSubtotal = json['subtotal'] ?? json['total'];
    final parsedSubtotal = (rawSubtotal is num)
        ? rawSubtotal.toDouble()
        : (double.tryParse(rawSubtotal?.toString() ?? '') ?? (parsedPrice * parsedQty));

    // Extract image URL
    String? imgUrl = json['image_url']?.toString() ?? json['image']?.toString();
    if (imgUrl == null && productData != null) {
      imgUrl = productData['image_url']?.toString();
      if (imgUrl == null && productData['images'] is List && (productData['images'] as List).isNotEmpty) {
        imgUrl = productData['images'][0]?.toString();
      }
    }

    DateTime? parsedItemExpiresAt;
    final rawItemExpires = json['expires_at'] ?? json['hold_expires_at'] ?? json['expiresAt'];
    if (rawItemExpires != null) {
      parsedItemExpiresAt = DateTime.tryParse(rawItemExpires.toString())?.toUtc();
    }

    return CartItemModel(
      id: (rawId is int) ? rawId : (int.tryParse(rawId.toString()) ?? rawId.toString()),
      productId: (rawProdId is int) ? rawProdId : (int.tryParse(rawProdId.toString()) ?? rawProdId.toString()),
      variantId: rawVariantId != null
          ? ((rawVariantId is int) ? rawVariantId : (int.tryParse(rawVariantId.toString()) ?? rawVariantId.toString()))
          : null,
      productName: name.isNotEmpty ? name : 'Flash Item',
      variantName: json['variant_name']?.toString(),
      variantSku: json['variant_sku']?.toString(),
      unitPrice: parsedPrice,
      quantity: parsedQty,
      subtotal: parsedSubtotal,
      imageUrl: imgUrl,
      expiresAt: parsedItemExpiresAt,
      product: productData != null ? ProductModel.fromJson(productData) : null,
    );
  }

  @override
  List<Object?> get props => [
        id,
        productId,
        variantId,
        productName,
        variantName,
        variantSku,
        unitPrice,
        quantity,
        subtotal,
        imageUrl,
        expiresAt,
        product,
      ];
}

class CartSummaryModel extends Equatable {
  final List<CartItemModel> items;
  final double subtotal;
  final int itemCount;
  final DateTime? expiresAt;

  const CartSummaryModel({
    this.items = const [],
    this.subtotal = 0.0,
    this.itemCount = 0,
    this.expiresAt,
  });

  factory CartSummaryModel.fromJson(Map<String, dynamic> json) {
    final rawList = json['items'] as List<dynamic>? ??
        json['cart_items'] as List<dynamic>? ??
        json['vault_items'] as List<dynamic>? ??
        json['data'] as List<dynamic>? ??
        [];

    final itemsList = rawList
        .where((e) => e != null && e is Map)
        .map((e) => CartItemModel.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();

    final rawSubtotal = json['subtotal'] ?? json['total'] ?? json['total_amount'];
    final calculatedSubtotal = itemsList.fold<double>(0.0, (sum, i) => sum + i.subtotal);
    final parsedSubtotal = (rawSubtotal is num)
        ? rawSubtotal.toDouble()
        : (double.tryParse(rawSubtotal?.toString() ?? '') ?? calculatedSubtotal);

    final rawCount = json['item_count'] ?? json['total_items'];
    final calculatedCount = itemsList.fold<int>(0, (sum, i) => sum + i.quantity);
    final parsedCount = rawCount is int ? rawCount : (int.tryParse(rawCount?.toString() ?? '') ?? calculatedCount);

    DateTime? parsedExpiresAt;
    final rawExpires = json['expires_at'] ?? json['hold_expires_at'] ?? json['expiresAt'];
    if (rawExpires != null) {
      parsedExpiresAt = DateTime.tryParse(rawExpires.toString())?.toUtc();
    } else if (itemsList.isNotEmpty) {
      final itemDates = itemsList.map((i) => i.expiresAt).whereType<DateTime>().toList();
      if (itemDates.isNotEmpty) {
        parsedExpiresAt = itemDates.reduce((a, b) => a.isBefore(b) ? a : b);
      }
    }

    return CartSummaryModel(
      items: itemsList,
      subtotal: parsedSubtotal,
      itemCount: parsedCount,
      expiresAt: parsedExpiresAt,
    );
  }

  @override
  List<Object?> get props => [items, subtotal, itemCount, expiresAt];
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
    this.code = '',
    this.discountType = 'fixed',
    this.discountValue = 0.0,
    this.calculatedDiscount = 0.0,
    this.message = '',
  });

  factory CouponValidationModel.fromJson(Map<String, dynamic> json) {
    return CouponValidationModel(
      valid: json['valid'] as bool? ?? json['is_valid'] as bool? ?? false,
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
  final dynamic id;
  final String recipientName;
  final String addressLine1;
  final String? addressLine2;
  final String city;
  final String state;
  final String postalCode;
  final String country;
  final String phone;
  final bool isDefault;

  const ShippingAddressModel({
    this.id,
    required this.recipientName,
    required this.addressLine1,
    this.addressLine2,
    required this.city,
    required this.state,
    required this.postalCode,
    required this.country,
    this.phone = '',
    this.isDefault = false,
  });

  factory ShippingAddressModel.fromJson(Map<String, dynamic> json) {
    return ShippingAddressModel(
      id: json['id'],
      recipientName: json['recipient_name'] as String? ?? json['full_name'] as String? ?? json['name'] as String? ?? '',
      addressLine1: json['address_line1'] as String? ?? json['address'] as String? ?? json['street'] as String? ?? '',
      addressLine2: json['address_line2'] as String?,
      city: json['city'] as String? ?? '',
      state: json['state'] as String? ?? json['province'] as String? ?? '',
      postalCode: json['postal_code'] as String? ?? json['zip_code'] as String? ?? json['zip'] as String? ?? '',
      country: json['country'] as String? ?? 'UNITED STATES',
      phone: json['phone'] as String? ?? json['phone_number'] as String? ?? '',
      isDefault: json['is_default'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'recipient_name': recipientName,
      'address_line1': addressLine1,
      if (addressLine2 != null) 'address_line2': addressLine2,
      'city': city,
      'state': state,
      'postal_code': postalCode,
      'country': country,
      'phone': phone,
      'is_default': isDefault,
    };
  }

  @override
  List<Object?> get props => [
        id,
        recipientName,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        phone,
        isDefault,
      ];
}
