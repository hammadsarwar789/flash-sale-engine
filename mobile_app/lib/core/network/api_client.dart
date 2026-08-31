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
          String? token;
          try {
            token = await storage.read(key: ApiConstants.tokenKey);
          } catch (e) {
            log('⚠️ Error reading token from storage: $e');
          }

          if (token != null) {
            String cleanToken = token.trim();
            if ((cleanToken.startsWith('"') && cleanToken.endsWith('"')) ||
                (cleanToken.startsWith("'") && cleanToken.endsWith("'"))) {
              cleanToken = cleanToken.substring(1, cleanToken.length - 1).trim();
            }

            if (cleanToken.isNotEmpty && cleanToken != 'null' && cleanToken != 'undefined') {
              options.headers['Authorization'] = 'Bearer $cleanToken';
              log('🔐 Outgoing Request with Bearer Token (${cleanToken.length > 12 ? "${cleanToken.substring(0, 8)}..." : cleanToken})');
            } else {
              options.headers.remove('Authorization');
            }
          } else {
            options.headers.remove('Authorization');
          }

          log('--> ${options.method} ${options.uri}');
          return handler.next(options);
        },
        onResponse: (response, handler) {
          log('<-- ${response.statusCode} ${response.requestOptions.uri}');
          return handler.next(response);
        },
        onError: (DioException e, handler) async {
          final statusCode = e.response?.statusCode;
          log('ERROR [$statusCode] => PATH: ${e.requestOptions.path}');
          log('Response Data: ${e.response?.data}');
          if (statusCode == 401 || statusCode == 403) {
            // Automatically clear stale or expired token credentials on 401/403
            try {
              await storage.delete(key: ApiConstants.tokenKey);
              await storage.delete(key: ApiConstants.userKey);
              log('🧹 Cleared expired/invalid auth credentials from storage');
            } catch (_) {}
          }
          return handler.next(e);
        },
      ),
    );
  }

  ApiException handleDioError(DioException e) {
    if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
      return ApiException(
        message: 'Your session has expired. Please sign in to continue.',
        statusCode: e.response?.statusCode,
        details: e.response?.data,
      );
    }

    final data = e.response?.data;
    if (data != null) {
      if (data is Map<String, dynamic>) {
        final detail = data['detail'] ?? data['message'] ?? data['title'] ?? data['error'];
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
