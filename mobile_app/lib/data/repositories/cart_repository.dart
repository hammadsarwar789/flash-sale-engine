import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:mobile_app/core/constants/api_constants.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/data/models/cart_model.dart';
import 'package:mobile_app/data/models/product_model.dart';

class CartRepository {
  final ApiClient _apiClient;
  final List<CartItemModel> _guestItems = [];
  DateTime? _guestExpiresAt;

  CartRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<String?> _getToken() async {
    try {
      final token = await _apiClient.storage.read(key: ApiConstants.tokenKey);
      if (token != null && token.trim().isNotEmpty && token != 'null' && token != 'undefined') {
        return token;
      }
    } catch (_) {}
    return null;
  }

  Future<CartSummaryModel> getCart() async {
    final token = await _getToken();

    if (token == null) {
      log('🛒 CartRepository: Guest mode active, returning in-memory vault.');
      if (_guestItems.isNotEmpty && _guestExpiresAt != null) {
        if (DateTime.now().toUtc().isAfter(_guestExpiresAt!)) {
          _guestItems.clear();
          _guestExpiresAt = null;
        }
      }
      final subtotal = _guestItems.fold<double>(0.0, (sum, i) => sum + i.subtotal);
      final count = _guestItems.fold<int>(0, (sum, i) => sum + i.quantity);
      return CartSummaryModel(
        items: List.unmodifiable(_guestItems),
        subtotal: double.parse(subtotal.toStringAsFixed(2)),
        itemCount: count,
        expiresAt: _guestExpiresAt,
      );
    }

    try {
      final response = await _apiClient.dio.get(ApiConstants.cart);
      log('🛒 CartRepository GET /cart RAW JSON: ${response.data}');
      final summary = CartSummaryModel.fromJson(response.data as Map<String, dynamic>);
      log('🛒 CartRepository parsed ${summary.items.length} items, subtotal: \$${summary.subtotal}, count: ${summary.itemCount}');
      return summary;
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        log('🛒 CartRepository: Session unauthenticated (401/403), falling back to guest vault.');
        final subtotal = _guestItems.fold<double>(0.0, (sum, i) => sum + i.subtotal);
        final count = _guestItems.fold<int>(0, (sum, i) => sum + i.quantity);
        return CartSummaryModel(
          items: List.unmodifiable(_guestItems),
          subtotal: double.parse(subtotal.toStringAsFixed(2)),
          itemCount: count,
          expiresAt: _guestExpiresAt,
        );
      }
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> addToCart({
    required dynamic productId,
    int quantity = 1,
    dynamic variantId,
    ProductModel? product,
  }) async {
    final token = await _getToken();

    if (token == null) {
      // In-memory guest cart
      if (_guestItems.isEmpty) {
        _guestExpiresAt = DateTime.now().toUtc().add(const Duration(minutes: 10));
      }
      final existingIndex = _guestItems.indexWhere(
        (i) => i.productId.toString() == productId.toString() && i.variantId?.toString() == variantId?.toString(),
      );
      if (existingIndex >= 0) {
        final oldItem = _guestItems[existingIndex];
        final newQty = oldItem.quantity + quantity;
        final unitPrice = oldItem.unitPrice;
        _guestItems[existingIndex] = CartItemModel(
          id: oldItem.id,
          productId: oldItem.productId,
          variantId: oldItem.variantId,
          productName: oldItem.productName,
          variantName: oldItem.variantName,
          variantSku: oldItem.variantSku,
          unitPrice: unitPrice,
          quantity: newQty,
          subtotal: double.parse((unitPrice * newQty).toStringAsFixed(2)),
          imageUrl: oldItem.imageUrl,
          expiresAt: _guestExpiresAt,
          product: oldItem.product ?? product,
        );
      } else {
        final price = product?.currentPrice ?? 0.0;
        _guestItems.add(
          CartItemModel(
            id: 'guest_${DateTime.now().millisecondsSinceEpoch}',
            productId: productId,
            variantId: variantId,
            productName: product?.name ?? 'Flash Item',
            unitPrice: price,
            quantity: quantity,
            subtotal: double.parse((price * quantity).toStringAsFixed(2)),
            imageUrl: product?.imageUrl,
            expiresAt: _guestExpiresAt,
            product: product,
          ),
        );
      }
      return;
    }

    try {
      log('🛒 CartRepository POST /cart/items: productId=$productId, variantId=$variantId, quantity=$quantity');
      await _apiClient.dio.post(
        ApiConstants.cartItems,
        data: {
          'product_id': productId,
          'quantity': quantity,
          'variant_id': ?variantId,
        },
      );
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> updateQuantity({required dynamic itemId, required int quantity}) async {
    final strId = itemId.toString();
    if (strId.startsWith('guest_')) {
      final index = _guestItems.indexWhere((i) => i.id.toString() == strId);
      if (index >= 0) {
        if (quantity <= 0) {
          _guestItems.removeAt(index);
          if (_guestItems.isEmpty) _guestExpiresAt = null;
        } else {
          final old = _guestItems[index];
          _guestItems[index] = CartItemModel(
            id: old.id,
            productId: old.productId,
            variantId: old.variantId,
            productName: old.productName,
            variantName: old.variantName,
            variantSku: old.variantSku,
            unitPrice: old.unitPrice,
            quantity: quantity,
            subtotal: double.parse((old.unitPrice * quantity).toStringAsFixed(2)),
            imageUrl: old.imageUrl,
            expiresAt: _guestExpiresAt,
            product: old.product,
          );
        }
      }
      return;
    }

    try {
      await _apiClient.dio.patch(
        ApiConstants.cartItem(itemId),
        data: {'quantity': quantity},
      );
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> removeFromCart(dynamic itemId) async {
    final strId = itemId.toString();
    if (strId.startsWith('guest_')) {
      _guestItems.removeWhere((i) => i.id.toString() == strId);
      if (_guestItems.isEmpty) _guestExpiresAt = null;
      return;
    }

    try {
      await _apiClient.dio.delete(ApiConstants.cartItem(itemId));
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> clearCart() async {
    _guestItems.clear();
    _guestExpiresAt = null;
    final token = await _getToken();
    if (token == null) return;

    try {
      await _apiClient.dio.delete(ApiConstants.cart);
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> syncGuestCartToServer() async {
    if (_guestItems.isEmpty) return;
    final itemsToSync = List<CartItemModel>.from(_guestItems);
    _guestItems.clear();
    _guestExpiresAt = null;
    for (final item in itemsToSync) {
      try {
        await _apiClient.dio.post(
          ApiConstants.cartItems,
          data: {
            'product_id': item.productId,
            'quantity': item.quantity,
            'variant_id': ?item.variantId,
          },
        );
      } catch (_) {}
    }
  }

  Future<CouponValidationModel> validateCoupon(String code, double amount) async {
    try {
      final response = await _apiClient.dio.post(
        '/commerce/coupons/validate',
        data: {
          'code': code.trim().toUpperCase(),
          'amount': amount,
        },
      );
      return CouponValidationModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<List<ShippingAddressModel>> getShippingAddresses() async {
    try {
      final response = await _apiClient.dio.get('/commerce/shipping-addresses');
      final List<dynamic> list = response.data is List ? response.data : [];
      return list.map((a) => ShippingAddressModel.fromJson(a as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<ShippingAddressModel> createShippingAddress(ShippingAddressModel address) async {
    try {
      final response = await _apiClient.dio.post(
        '/commerce/shipping-addresses',
        data: address.toJson(),
      );
      return ShippingAddressModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }
}
