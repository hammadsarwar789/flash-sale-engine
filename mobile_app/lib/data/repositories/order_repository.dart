import 'package:dio/dio.dart';
import 'package:mobile_app/core/constants/api_constants.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/data/models/order_model.dart';
import 'package:uuid/uuid.dart';

class OrderRepository {
  final ApiClient _apiClient;
  final Uuid _uuid = const Uuid();

  OrderRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Core Flash Sale Stock Reservation
  /// Generates a unique Idempotency-Key to prevent double-charging or duplicate reservations.
  Future<ReservationResponse> reserveFlashSaleItem({
    required int productId,
    required int quantity,
    String? customIdempotencyKey,
  }) async {
    try {
      final idempotencyKey = customIdempotencyKey ?? _uuid.v4();

      final response = await _apiClient.dio.post(
        ApiConstants.reserveOrder,
        data: {
          'product_id': productId,
          'quantity': quantity,
        },
        options: Options(
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        ),
      );

      return ReservationResponse.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<List<OrderModel>> getOrders() async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.orders);
      final dynamic data = response.data;
      List<dynamic> list;
      if (data is List) {
        list = data;
      } else if (data is Map<String, dynamic> && data['orders'] is List) {
        list = data['orders'];
      } else if (data is Map<String, dynamic> && data['items'] is List) {
        list = data['items'];
      } else {
        list = [];
      }

      return list.map((item) => OrderModel.fromJson(item as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<OrderModel> getOrderDetail(int orderId) async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.orderDetail(orderId));
      return OrderModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> payOrder({
    required int orderId,
    required String paymentMethod,
  }) async {
    try {
      await _apiClient.dio.post(
        ApiConstants.createPaymentIntent(orderId),
        data: {
          'payment_method': paymentMethod,
        },
      );
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }
}
