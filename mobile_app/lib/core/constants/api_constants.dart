import 'dart:io';
import 'package:flutter/foundation.dart';

class ApiConstants {
  // Base URLs configured for Android emulator, iOS simulator, web & desktop
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:5000/api/v1';
    }
    if (Platform.isAndroid) {
      // 10.0.2.2 maps to host machine localhost in standard Android emulator
      return 'http://10.0.2.2:5000/api/v1';
    }
    // iOS simulator / macOS / Windows / Linux
    return 'http://localhost:5000/api/v1';
  }

  // Auth Endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String me = '/auth/me';

  // Products & Categories
  static const String products = '/products';
  static const String categories = '/products/categories';
  static String productDetail(int id) => '/products/$id';

  // Cart Endpoints
  static const String cart = '/cart';
  static const String cartItems = '/cart/items';
  static String cartItem(int id) => '/cart/items/$id';

  // Order & Flash Sale Endpoints
  static const String reserveOrder = '/orders/reserve';
  static const String orders = '/orders';
  static String orderDetail(int id) => '/orders/$id';
  static String createPaymentIntent(int id) => '/orders/$id/pay';

  // Storage Keys
  static const String tokenKey = 'jwt_auth_token';
  static const String userKey = 'cached_user_profile';
}
