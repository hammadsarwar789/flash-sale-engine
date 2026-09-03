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

  /// Checkout Multi-Item Cart Endpoint matching web payload:
  /// items: list of { variant_id, quantity, unit_price }
  /// reservation_ids: list of active hold IDs
  /// shipping_address & payment_method
  Future<OrderModel> checkoutCart({
    String? couponCode,
    String? shippingAddressId,
    Map<String, dynamic>? shippingAddress,
    String? paymentMethod,
    List<Map<String, dynamic>>? items,
    List<String>? reservationIds,
    String? customIdempotencyKey,
  }) async {
    try {
      final idempotencyKey = customIdempotencyKey ?? _uuid.v4();
      final data = <String, dynamic>{};
      if (couponCode != null && couponCode.isNotEmpty) {
        data['coupon_code'] = couponCode;
      }
      if (shippingAddressId != null) {
        data['shipping_address_id'] = shippingAddressId;
      }
      if (shippingAddress != null) {
        data['shipping_address'] = shippingAddress;
      }
      if (paymentMethod != null) {
        data['payment_method'] = paymentMethod;
      }
      if (items != null && items.isNotEmpty) {
        data['items'] = items;
      }
      if (reservationIds != null && reservationIds.isNotEmpty) {
        data['reservation_ids'] = reservationIds;
      }

      final response = await _apiClient.dio.post(
        ApiConstants.checkout,
        data: data.isNotEmpty ? data : null,
        options: Options(
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        ),
      );

      final respData = response.data as Map<String, dynamic>;
      if (respData['order'] != null) {
        return OrderModel.fromJson(respData['order'] as Map<String, dynamic>);
      }
      return OrderModel.fromJson(respData);
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  /// Guest Checkout Endpoint matching web schema
  Future<OrderModel> guestCheckout({
    required String email,
    required List<Map<String, dynamic>> items,
    String? couponCode,
    Map<String, dynamic>? shippingAddress,
    String? customIdempotencyKey,
  }) async {
    try {
      final idempotencyKey = customIdempotencyKey ?? _uuid.v4();
      final payload = <String, dynamic>{
        'email': email,
        'items': items,
      };
      if (couponCode != null) payload['coupon_code'] = couponCode;
      if (shippingAddress != null) payload['shipping_address'] = shippingAddress;

      final response = await _apiClient.dio.post(
        ApiConstants.guestCheckout,
        data: payload,
        options: Options(
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        ),
      );

      final respData = response.data as Map<String, dynamic>;
      if (respData['order'] != null) {
        return OrderModel.fromJson(respData['order'] as Map<String, dynamic>);
      }
      return OrderModel.fromJson(respData);
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

  Future<OrderModel> getOrderDetail(dynamic orderId) async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.orderDetail(orderId));
      return OrderModel.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> payOrder({
    required dynamic orderId,
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

  Future<void> cancelOrder(dynamic orderId) async {
    try {
      await _apiClient.dio.post(ApiConstants.cancelOrder(orderId));
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }
}
