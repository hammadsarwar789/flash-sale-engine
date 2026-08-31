import 'package:dio/dio.dart';
import 'package:mobile_app/core/network/api_client.dart';

class VendorRepository {
  final ApiClient _apiClient;

  VendorRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<Map<String, dynamic>> getVendorProfile() async {
    try {
      final response = await _apiClient.dio.get('/vendor/profile');
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<Map<String, dynamic>> getVendorFinance() async {
    try {
      final response = await _apiClient.dio.get('/vendor/finance');
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<List<dynamic>> getVendorProducts() async {
    try {
      final response = await _apiClient.dio.get('/vendor/products');
      return response.data is List ? (response.data as List) : [];
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<List<dynamic>> getVendorSubOrders() async {
    try {
      final response = await _apiClient.dio.get('/vendor/sub-orders');
      return response.data is List ? (response.data as List) : [];
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> updateSubOrderStatus(String subOrderId, String status) async {
    try {
      await _apiClient.dio.patch(
        '/vendor/sub-orders/$subOrderId/status',
        data: {'status': status},
      );
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> createVendorProduct(Map<String, dynamic> data) async {
    try {
      await _apiClient.dio.post('/vendor/products', data: data);
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> requestPayout(double amount) async {
    try {
      await _apiClient.dio.post('/vendor/payouts', data: {'amount': amount});
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }
}
