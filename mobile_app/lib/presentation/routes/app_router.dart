import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../data/models/order_model.dart';
import '../../logic/auth/auth_bloc.dart';
import '../../logic/auth/auth_state.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/auth/forgot_password_screen.dart';
import '../screens/auth/reset_password_screen.dart';
import '../screens/cart/cart_screen.dart';
import '../screens/checkout/checkout_screen.dart';
import '../screens/home/home_screen.dart';
import '../screens/orders/orders_screen.dart';
import '../screens/orders/order_detail_screen.dart';
import '../screens/product/product_detail_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/splash/splash_screen.dart';
import '../screens/vendor/vendor_dashboard_screen.dart';
import '../screens/wishlist/wishlist_screen.dart';

class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/',
    redirect: _globalRedirect,
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashScreen(),
      ),

      // --- Public Auth Routes ---
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/reset-password',
        builder: (context, state) {
          final token = state.extra as String?;
          return ResetPasswordScreen(initialToken: token);
        },
      ),

      // --- Public Routes ---
      GoRoute(
        path: '/home',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/product/:id',
        builder: (context, state) {
          final idStr = state.pathParameters['id'] ?? '0';
          final productId = int.tryParse(idStr) ?? idStr;
          return ProductDetailScreen(productId: productId);
        },
      ),

      // --- Protected Routes (require auth) ---
      GoRoute(
        path: '/cart',
        builder: (context, state) => const CartScreen(),
      ),
      GoRoute(
        path: '/checkout',
        builder: (context, state) {
          OrderModel? order;
          String? couponCode;
          double discount = 0.0;

          if (state.extra is OrderModel) {
            order = state.extra as OrderModel;
          } else if (state.extra is Map<String, dynamic>) {
            final map = state.extra as Map<String, dynamic>;
            order = map['order'] as OrderModel?;
            couponCode = map['couponCode'] as String?;
            discount = (map['discount'] is num) ? (map['discount'] as num).toDouble() : 0.0;
          }

          if (order == null) {
            return const Scaffold(
              body: Center(child: Text('Invalid Order')),
            );
          }
          return CheckoutScreen(
            order: order,
            couponCode: couponCode,
            discount: discount,
          );
        },
      ),
      GoRoute(
        path: '/orders',
        builder: (context, state) => const OrdersScreen(),
      ),
      GoRoute(
        path: '/order/:id',
        builder: (context, state) {
          final idStr = state.pathParameters['id'] ?? '0';
          final orderId = int.tryParse(idStr) ?? idStr;
          return OrderDetailScreen(orderId: orderId);
        },
      ),
      GoRoute(
        path: '/wishlist',
        builder: (context, state) => const WishlistScreen(),
      ),
      GoRoute(
        path: '/profile',
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: '/vendor',
        builder: (context, state) => const VendorDashboardScreen(),
      ),
    ],
  );

  /// Global redirect: protect routes that need authentication.
  /// Public routes (splash, login, register, forgot/reset password, home, product) are open.
  /// Everything else requires the user to be authenticated.
  static String? _globalRedirect(BuildContext context, GoRouterState state) {
    final authState = context.read<AuthBloc>().state;
    final isAuthenticated = authState is Authenticated;
    final currentPath = state.matchedLocation;

    // Routes that don't require authentication
    const publicPaths = [
      '/',
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/home',
    ];

    final isPublic = publicPaths.contains(currentPath) ||
        currentPath.startsWith('/product/');

    // If not authenticated and trying to access a protected route → redirect to login
    if (!isAuthenticated && !isPublic) {
      return '/login';
    }

    // If authenticated and on login/register → redirect to home
    if (isAuthenticated &&
        (currentPath == '/login' || currentPath == '/register')) {
      return '/home';
    }

    return null; // No redirect needed
  }
}
