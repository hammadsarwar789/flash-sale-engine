import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'core/theme/app_theme.dart';
import 'data/repositories/auth_repository.dart';
import 'data/repositories/cart_repository.dart';
import 'data/repositories/order_repository.dart';
import 'data/repositories/product_repository.dart';
import 'data/repositories/wishlist_repository.dart';
import 'logic/auth/auth_bloc.dart';
import 'logic/auth/auth_event.dart';
import 'logic/cart/cart_bloc.dart';
import 'logic/orders/order_bloc.dart';
import 'logic/products/product_bloc.dart';
import 'logic/wishlist/wishlist_bloc.dart';
import 'logic/reviews/review_bloc.dart';
import 'logic/checkout/checkout_bloc.dart';
import 'core/theme/theme_controller.dart';
import 'presentation/routes/app_router.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const FlashSaleApp());
}

class FlashSaleApp extends StatelessWidget {
  const FlashSaleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider<AuthRepository>(
          create: (_) => AuthRepository(),
        ),
        RepositoryProvider<ProductRepository>(
          create: (_) => ProductRepository(),
        ),
        RepositoryProvider<CartRepository>(
          create: (_) => CartRepository(),
        ),
        RepositoryProvider<OrderRepository>(
          create: (_) => OrderRepository(),
        ),
        RepositoryProvider<WishlistRepository>(
          create: (_) => WishlistRepository(),
        ),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider<AuthBloc>(
            create: (context) => AuthBloc(
              authRepository: context.read<AuthRepository>(),
            )..add(AppStartedEvent()),
          ),
          BlocProvider<ProductBloc>(
            create: (context) => ProductBloc(
              productRepository: context.read<ProductRepository>(),
            ),
          ),
          BlocProvider<CartBloc>(
            create: (context) => CartBloc(
              cartRepository: context.read<CartRepository>(),
            ),
          ),
          BlocProvider<OrderBloc>(
            create: (context) => OrderBloc(
              orderRepository: context.read<OrderRepository>(),
            ),
          ),
          BlocProvider<WishlistBloc>(
            create: (context) => WishlistBloc(
              wishlistRepository: context.read<WishlistRepository>(),
            ),
          ),
          BlocProvider<ReviewBloc>(
            create: (context) => ReviewBloc(
              productRepository: context.read<ProductRepository>(),
            ),
          ),
          BlocProvider<CheckoutBloc>(
            create: (context) => CheckoutBloc(
              orderRepository: context.read<OrderRepository>(),
            ),
          ),
        ],
        child: AnimatedBuilder(
          animation: ThemeController.instance,
          builder: (context, _) {
            return MaterialApp.router(
              title: 'Flash Sale Engine',
              scaffoldMessengerKey: AppRouter.scaffoldMessengerKey,
              debugShowCheckedModeBanner: false,
              theme: AppTheme.lightTheme,
              darkTheme: AppTheme.darkTheme,
              themeMode: ThemeController.instance.themeMode,
              routerConfig: AppRouter.router,
            );
          },
        ),
      ),
    );
  }
}
