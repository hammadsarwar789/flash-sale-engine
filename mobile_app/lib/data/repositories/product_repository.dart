import 'package:dio/dio.dart';
import 'package:mobile_app/core/constants/api_constants.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/data/models/category_model.dart';
import 'package:mobile_app/data/models/product_model.dart';

class ProductRepository {
  final ApiClient _apiClient;

  ProductRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<List<ProductModel>> getProducts({
    int? categoryId,
    bool? isFlashSale,
    String? search,
    String? sortBy,
    int? page,
    int? perPage,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (categoryId != null) queryParams['category_id'] = categoryId;
      if (isFlashSale != null) queryParams['is_flash_sale'] = isFlashSale;
      if (search != null && search.isNotEmpty) queryParams['search'] = search;
      if (sortBy != null && sortBy.isNotEmpty) queryParams['sort_by'] = sortBy;
      if (page != null) queryParams['page'] = page;
      if (perPage != null) queryParams['per_page'] = perPage;

      final response = await _apiClient.dio.get(
        ApiConstants.products,
        queryParameters: queryParams,
      );

      dynamic data = response.data;
      List<dynamic> list;
      if (data is List) {
        list = data;
      } else if (data is Map<String, dynamic> && data['items'] is List) {
        list = data['items'];
      } else if (data is Map<String, dynamic> && data['products'] is List) {
        list = data['products'];
      } else {
        list = [];
      }

      return list.map((item) => ProductModel.fromJson(item as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<PaginatedProducts> getPaginatedProducts({
    int? categoryId,
    bool? isFlashSale,
    String? search,
    String? sortBy,
    int page = 1,
    int perPage = 20,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'per_page': perPage,
      };
      if (categoryId != null) queryParams['category_id'] = categoryId;
      if (isFlashSale != null) queryParams['is_flash_sale'] = isFlashSale;
      if (search != null && search.isNotEmpty) queryParams['search'] = search;
      if (sortBy != null && sortBy.isNotEmpty) queryParams['sort_by'] = sortBy;

      final response = await _apiClient.dio.get(
        ApiConstants.products,
        queryParameters: queryParams,
      );

      if (response.data is Map<String, dynamic>) {
        return PaginatedProducts.fromJson(response.data as Map<String, dynamic>);
      } else if (response.data is List) {
        final items = (response.data as List)
            .map((item) => ProductModel.fromJson(item as Map<String, dynamic>))
            .toList();
        return PaginatedProducts(items: items, total: items.length);
      }
      return const PaginatedProducts(items: []);
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<List<CategoryModel>> getCategories() async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.categories);
      final List<dynamic> list = response.data is List ? response.data : [];
      return list.map((item) => CategoryModel.fromJson(item as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<ProductModel> getProductById(dynamic id) async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.productDetail(id));
      return ProductModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<List<VariantModel>> getProductVariants(dynamic productId) async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.productVariants(productId));
      final List<dynamic> list = response.data is List ? response.data : [];
      return list.map((item) => VariantModel.fromJson(item as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<List<ReviewModel>> getProductReviews(dynamic productId) async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.productReviews(productId));
      final List<dynamic> list = response.data is List ? response.data : [];
      return list.map((item) => ReviewModel.fromJson(item as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<ReviewModel> submitProductReview(
    dynamic productId, {
    required int rating,
    String? title,
    String? comment,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        ApiConstants.productReviews(productId),
        data: {
          'rating': rating,
          'title': title,
          'comment': comment,
        },
      );
      return ReviewModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }
}
