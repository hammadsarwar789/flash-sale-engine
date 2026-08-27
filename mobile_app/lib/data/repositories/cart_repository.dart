import 'package:dio/dio.dart';
import 'package:mobile_app/core/constants/api_constants.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/data/models/cart_model.dart';

class CartRepository {
  final ApiClient _apiClient;

  CartRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<CartSummaryModel> getCart() async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.cart);
      return CartSummaryModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> addToCart({
    required int productId,
    int quantity = 1,
    int? variantId,
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

  Future<void> updateQuantity({required int itemId, required int quantity}) async {
    try {
      await _apiClient.dio.put(
        ApiConstants.cartItem(itemId),
        data: {'quantity': quantity},
      );
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> removeFromCart(int itemId) async {
    try {
      await _apiClient.dio.delete(ApiConstants.cartItem(itemId));
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }
}
