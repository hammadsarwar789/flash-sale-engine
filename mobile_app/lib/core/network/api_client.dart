import 'dart:developer';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile_app/core/constants/api_constants.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic details;

  ApiException({
    required this.message,
    this.statusCode,
    this.details,
  });

  @override
  String toString() => message;
}

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio dio;
  final FlutterSecureStorage storage = const FlutterSecureStorage();

  ApiClient._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await storage.read(key: ApiConstants.tokenKey);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          log('--> ${options.method} ${options.uri}');
          return handler.next(options);
        },
        onResponse: (response, handler) {
          log('<-- ${response.statusCode} ${response.requestOptions.uri}');
          return handler.next(response);
        },
        onError: (DioException e, handler) {
          log('ERROR [${e.response?.statusCode}] => PATH: ${e.requestOptions.path}');
          log('Response Data: ${e.response?.data}');
          return handler.next(e);
        },
      ),
    );
  }

  ApiException handleDioError(DioException e) {
    if (e.response != null && e.response?.data != null) {
      final data = e.response!.data;
      if (data is Map<String, dynamic>) {
        final detail = data['detail'] ?? data['message'] ?? data['title'];
        if (detail != null) {
          return ApiException(
            message: detail.toString(),
            statusCode: e.response?.statusCode,
            details: data,
          );
        }
      }
    }

    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException(message: 'Connection timed out. Please check your network.');
      case DioExceptionType.connectionError:
        return ApiException(
          message: 'Unable to connect to Flash Sale server at ${ApiConstants.baseUrl}. Ensure backend is running.',
        );
      case DioExceptionType.cancel:
        return ApiException(message: 'Request was cancelled.');
      default:
        return ApiException(
          message: e.message ?? 'An unexpected network error occurred.',
          statusCode: e.response?.statusCode,
        );
    }
  }
}
