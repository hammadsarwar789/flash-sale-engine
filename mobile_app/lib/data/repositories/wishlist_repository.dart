import 'package:dio/dio.dart';
import 'package:mobile_app/core/constants/api_constants.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/data/models/wishlist_model.dart';

class WishlistRepository {
  final ApiClient _apiClient;
  final List<WishlistItemModel> _guestWishlist = [];

  WishlistRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<String?> _getToken() async {
    try {
      final token = await _apiClient.storage.read(key: ApiConstants.tokenKey);
      if (token != null && token.trim().isNotEmpty && token != 'null' && token != 'undefined') {
        return token;
      }
    } catch (_) {}
    return null;
  }

  Future<List<WishlistItemModel>> getWishlist() async {
    final token = await _getToken();

    if (token == null) {
      return List.unmodifiable(_guestWishlist);
    }

    try {
      final response = await _apiClient.dio.get(ApiConstants.wishlist);
      final List<dynamic> list = response.data is List ? response.data : [];
      return list.map((item) => WishlistItemModel.fromJson(item as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        return List.unmodifiable(_guestWishlist);
      }
      throw _apiClient.handleDioError(e);
    }
  }

  Future<WishlistItemModel> addToWishlist(dynamic productId, [ProductModel? product]) async {
    final token = await _getToken();

    if (token == null) {
      final existing = _guestWishlist.where((i) => i.productId.toString() == productId.toString()).toList();
      if (existing.isNotEmpty) return existing.first;

      final newItem = WishlistItemModel(
        id: 'guest_w_${productId}_${DateTime.now().millisecondsSinceEpoch}',
        productId: productId,
        createdAt: DateTime.now().toIso8601String(),
        product: product,
      );
      _guestWishlist.add(newItem);
      return newItem;
    }

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
    final strId = itemId.toString();
    _guestWishlist.removeWhere((i) => i.id.toString() == strId || i.productId.toString() == strId);

    final token = await _getToken();
    if (token == null || strId.startsWith('guest_')) {
      return;
    }

    try {
      await _apiClient.dio.delete(ApiConstants.wishlistItem(itemId));
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> syncGuestWishlistToServer() async {
    if (_guestWishlist.isEmpty) return;
    final itemsToSync = List<WishlistItemModel>.from(_guestWishlist);
    _guestWishlist.clear();
    for (final item in itemsToSync) {
      try {
        await _apiClient.dio.post(
          ApiConstants.wishlistItems,
          data: {'product_id': item.productId},
        );
      } catch (_) {}
    }
  }
}
