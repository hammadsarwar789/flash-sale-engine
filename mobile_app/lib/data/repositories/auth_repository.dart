import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:mobile_app/core/constants/api_constants.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/data/models/user_model.dart';

class AuthRepository {
  final ApiClient _apiClient;

  AuthRepository({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<AuthResponse> login({required String email, required String password}) async {
    try {
      final response = await _apiClient.dio.post(
        ApiConstants.login,
        data: {
          'email': email.trim().toLowerCase(),
          'password': password,
        },
      );

      final authResponse = AuthResponse.fromJson(response.data as Map<String, dynamic>);
      
      // Persist Token & User profile
      await _apiClient.storage.write(key: ApiConstants.tokenKey, value: authResponse.accessToken);
      if (authResponse.user != null) {
        await _apiClient.storage.write(
          key: ApiConstants.userKey,
          value: jsonEncode(authResponse.user!.toJson()),
        );
      }
      return authResponse;
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<void> register({
    required String email,
    required String password,
    String? fullName,
    String role = 'customer',
  }) async {
    try {
      await _apiClient.dio.post(
        ApiConstants.register,
        data: {
          'email': email.trim().toLowerCase(),
          'password': password,
          'full_name': fullName,
          'role': role,
        },
      );
    } on DioException catch (e) {
      throw _apiClient.handleDioError(e);
    }
  }

  Future<UserModel?> getCurrentUser() async {
    try {
      final cached = await _apiClient.storage.read(key: ApiConstants.userKey);
      if (cached != null) {
        final Map<String, dynamic> data = jsonDecode(cached);
        return UserModel.fromJson(data);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  Future<String?> getToken() async {
    return await _apiClient.storage.read(key: ApiConstants.tokenKey);
  }

  Future<void> logout() async {
    await _apiClient.storage.delete(key: ApiConstants.tokenKey);
    await _apiClient.storage.delete(key: ApiConstants.userKey);
  }
}
