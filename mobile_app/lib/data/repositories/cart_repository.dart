import 'package:dio/dio.dart';
import 'package:mobile_app/core/constants/api_constants.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/data/models/cart_model.dart';

class CartRepository {
  final ApiClient _apiClient;

  CartRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<CartSummaryModel> getCart() async {
    String? token;
    try {
      token = await _apiClient.storage.read(key: ApiConstants.tokenKey);
    } catch (_) {}

    if (token == null || token.trim().isEmpty || token == 'null' || token == 'undefined') {
      return const CartSummaryModel(items: [], subtotal: 0.0, itemCount: 0);
    }

    try {
      final response = await _apiClient.dio.get(ApiConstants.cart);
      return CartSummaryModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        return const CartSummaryModel(items: [], subtotal: 0.0, itemCount: 0);
      }
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> addToCart({
    required dynamic productId,
    int quantity = 1,
    dynamic variantId,
  }) async {
    try {
      await _apiClient.dio.post(
        ApiConstants.cartItems,
        data: {
          'product_id': productId,
          'quantity': quantity,
          if (variantId != null) 'variant_id': variantId,
        },
      );
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> updateQuantity({required dynamic itemId, required int quantity}) async {
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
    try {
      await _apiClient.dio.delete(ApiConstants.cartItem(itemId));
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> clearCart() async {
    try {
      await _apiClient.dio.delete(ApiConstants.cart);
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
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
