import 'dart:io';
import 'package:flutter/foundation.dart';

class ApiConstants {
  // Server host without /api/v1 prefix (for static uploads)
  static String get serverHost {
    if (kIsWeb) {
      return 'http://localhost:5000';
    }
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:5000';
    }
    return 'http://localhost:5000';
  }

  // Base URLs configured for Android emulator, iOS simulator, web & desktop
  static String get baseUrl => '$serverHost/api/v1';

  /// Resolves relative URLs (e.g. /static/uploads/...) to absolute HTTP URLs using the server host
  static String? resolveImageUrl(String? path) {
    if (path == null || path.trim().isEmpty) return null;
    final trimmed = path.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    if (trimmed.startsWith('/')) {
      return '$serverHost$trimmed';
    }
    return '$serverHost/$trimmed';
  }

  // Auth Endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String me = '/auth/me';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';

  // Products & Categories
  static const String products = '/products';
  static const String categories = '/products/categories';
  static String productDetail(dynamic id) => '/products/$id';
  static String productVariants(dynamic id) => '/products/$id/variants';
  static String productReviews(dynamic id) => '/commerce/products/$id/reviews';

  // Wishlist Endpoints
  static const String wishlist = '/commerce/wishlist';
  static const String wishlistItems = '/commerce/wishlist/items';
  static String wishlistItem(dynamic id) => '/commerce/wishlist/items/$id';

  // Cart Endpoints
  static const String cart = '/cart';
  static const String cartItems = '/cart/items';
  static String cartItem(dynamic id) => '/cart/items/$id';

  // Order & Flash Sale Endpoints
  static const String reserveOrder = '/orders/reserve';
  static const String checkout = '/orders/checkout';
  static const String guestCheckout = '/orders/guest-checkout';
  static const String orders = '/orders';
  static String orderDetail(dynamic id) => '/orders/$id';
  static String createPaymentIntent(dynamic id) => '/orders/$id/pay';
  static String cancelOrder(dynamic id) => '/orders/$id/cancel';
  static String restoreCart(dynamic id) => '/orders/$id/restore-cart';

  // Storage Keys
  static const String tokenKey = 'jwt_auth_token';
  static const String userKey = 'cached_user_profile';
}
