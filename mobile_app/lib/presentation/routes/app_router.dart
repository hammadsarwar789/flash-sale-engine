import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_app/data/models/order_model.dart';
import 'package:mobile_app/logic/auth/auth_bloc.dart';
import 'package:mobile_app/logic/auth/auth_state.dart';
import 'package:mobile_app/presentation/screens/auth/forgot_password_screen.dart';
import 'package:mobile_app/presentation/screens/auth/login_screen.dart';
import 'package:mobile_app/presentation/screens/auth/register_screen.dart';
import 'package:mobile_app/presentation/screens/auth/reset_password_screen.dart';
import 'package:mobile_app/presentation/screens/cart/cart_screen.dart';
import 'package:mobile_app/presentation/screens/checkout/checkout_screen.dart';
import 'package:mobile_app/presentation/screens/home/home_screen.dart';
import 'package:mobile_app/presentation/screens/orders/order_detail_screen.dart';
import 'package:mobile_app/presentation/screens/orders/orders_screen.dart';
import 'package:mobile_app/presentation/screens/product/product_detail_screen.dart';
import 'package:mobile_app/presentation/screens/profile/profile_screen.dart';
import 'package:mobile_app/presentation/screens/shell/main_layout_screen.dart';
import 'package:mobile_app/presentation/screens/splash/splash_screen.dart';
import 'package:mobile_app/presentation/screens/vendor/vendor_dashboard_screen.dart';
import 'package:mobile_app/presentation/screens/wishlist/wishlist_screen.dart';

class AppRouteObserver extends NavigatorObserver {
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    AppRouter.scaffoldMessengerKey.currentState?.hideCurrentSnackBar();
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPop(route, previousRoute);
    AppRouter.scaffoldMessengerKey.currentState?.hideCurrentSnackBar();
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    AppRouter.scaffoldMessengerKey.currentState?.hideCurrentSnackBar();
  }
}

class AppRouter {
  static final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey =
      GlobalKey<ScaffoldMessengerState>();

  static final GoRouter router = GoRouter(
    initialLocation: '/home',
    observers: [AppRouteObserver()],
    redirect: _globalRedirect,
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const SplashScreen(),
      ),

      // --- Public Auth Routes ---
      GoRoute(
        path: '/login',
        builder: (context, state) {
          String? returnTo;
          dynamic returnExtra;
          if (state.extra is Map<String, dynamic>) {
            final map = state.extra as Map<String, dynamic>;
            returnTo = map['returnTo'] as String?;
            returnExtra = map['checkoutData'] ?? map['extra'];
          } else if (state.extra is String) {
            returnTo = state.extra as String;
          }
          returnTo ??= state.uri.queryParameters['returnTo'];
          return LoginScreen(returnTo: returnTo, returnExtra: returnExtra);
        },
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

      // --- Persistent Shell Navigation (5 Primary Tabs) ---
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return MainLayoutScreen(navigationShell: navigationShell);
        },
        branches: [
          // Branch 0: Floor
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          // Branch 1: Wishlist / Saved Vault
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/wishlist',
                builder: (context, state) => const WishlistScreen(),
              ),
            ],
          ),
          // Branch 2: Cart / Hold Vault
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/cart',
                builder: (context, state) => const CartScreen(),
              ),
            ],
          ),
          // Branch 3: Orders
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/orders',
                builder: (context, state) => const OrdersScreen(),
              ),
            ],
          ),
          // Branch 4: Profile / Account
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),

      // --- Pushed Detail Routes (Pushed on top of the shell with Back button) ---
      GoRoute(
        path: '/product/:id',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return ProductDetailScreen(productId: id);
        },
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
        path: '/order/:id',
        builder: (context, state) {
          final idStr = state.pathParameters['id'] ?? '0';
          final orderId = int.tryParse(idStr) ?? idStr;
          return OrderDetailScreen(orderId: orderId);
        },
      ),
      GoRoute(
        path: '/vendor',
        builder: (context, state) => const VendorDashboardScreen(),
      ),
    ],
  );

  /// Global redirect: protect only checkout and vendor routes.
  /// Public routes (floor, product detail, wishlist, cart, orders tab, profile tab, auth) are accessible.
  static String? _globalRedirect(BuildContext context, GoRouterState state) {
    final authState = context.read<AuthBloc>().state;
    final isAuthenticated = authState is Authenticated;
    final currentPath = state.matchedLocation;

    // Only protect routes that strictly require authentication if accessed directly via URL
    if (!isAuthenticated) {
      if (currentPath == '/checkout') {
        return '/login?returnTo=/checkout';
      }
      if (currentPath == '/vendor') {
        return '/login?returnTo=/vendor';
      }
    }

    // If authenticated and currently on login/register → redirect to returnTo or /home
    if (isAuthenticated && (currentPath == '/login' || currentPath == '/register')) {
      final extraMap = state.extra is Map<String, dynamic> ? state.extra as Map<String, dynamic> : null;
      final returnTo = extraMap?['returnTo'] as String? ?? state.uri.queryParameters['returnTo'];
      if (returnTo != null && returnTo.isNotEmpty && returnTo != '/login' && returnTo != '/register') {
        return returnTo;
      }
      return '/home';
    }

    return null;
  }
}
