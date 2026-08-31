import 'package:dio/dio.dart';
import 'package:mobile_app/core/constants/api_constants.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/data/models/wishlist_model.dart';

class WishlistRepository {
  final ApiClient _apiClient;

  WishlistRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<List<WishlistItemModel>> getWishlist() async {
    String? token;
    try {
      token = await _apiClient.storage.read(key: ApiConstants.tokenKey);
    } catch (_) {}

    if (token == null || token.trim().isEmpty || token == 'null' || token == 'undefined') {
      return [];
    }

    try {
      final response = await _apiClient.dio.get(ApiConstants.wishlist);
      final List<dynamic> list = response.data is List ? response.data : [];
      return list.map((item) => WishlistItemModel.fromJson(item as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        return [];
      }
      throw _apiClient.handleDioError(e);
    }
  }

  Future<WishlistItemModel> addToWishlist(dynamic productId) async {
    try {
      final response = await _apiClient.dio.post(
        ApiConstants.wishlistItems,
        data: {'product_id': productId},
      );
      return WishlistItemModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> removeFromWishlist(dynamic itemId) async {
    try {
      await _apiClient.dio.delete(ApiConstants.wishlistItem(itemId));
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }
}
