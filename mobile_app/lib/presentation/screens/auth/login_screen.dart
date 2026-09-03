import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/logic/auth/auth_bloc.dart';
import 'package:mobile_app/logic/auth/auth_event.dart';
import 'package:mobile_app/logic/auth/auth_state.dart';
import 'package:mobile_app/logic/cart/cart_bloc.dart';
import 'package:mobile_app/logic/cart/cart_event.dart';
import 'package:mobile_app/logic/wishlist/wishlist_bloc.dart';
import 'package:mobile_app/logic/wishlist/wishlist_event.dart';
import 'package:mobile_app/presentation/widgets/app_toast.dart';

import 'package:mobile_app/data/repositories/cart_repository.dart';
import 'package:mobile_app/data/repositories/wishlist_repository.dart';

class LoginScreen extends StatefulWidget {
  final String? returnTo;
  final dynamic returnExtra;

  const LoginScreen({
    super.key,
    this.returnTo,
    this.returnExtra,
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState?.validate() ?? false) {
      context.read<AuthBloc>().add(
            LoginSubmittedEvent(
              email: _emailController.text.trim(),
              password: _passwordController.text,
            ),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryTextColor = isDark ? C.darkText : const Color(0xFF111827);

    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) async {
        if (state is Authenticated) {
          final cartRepo = context.read<CartRepository>();
          final wishlistRepo = context.read<WishlistRepository>();
          try {
            await cartRepo.syncGuestCartToServer();
            await wishlistRepo.syncGuestWishlistToServer();
          } catch (_) {}
          if (!context.mounted) return;
          context.read<CartBloc>().add(LoadCartEvent());
          context.read<WishlistBloc>().add(LoadWishlistEvent());
          if (widget.returnTo != null && widget.returnTo!.isNotEmpty) {
            context.go(widget.returnTo!, extra: widget.returnExtra);
          } else {
            context.go('/home');
          }
        } else if (state is AuthFailure) {
          AppToast.showError(context, state.message);
        }
      },
      child: Scaffold(
        backgroundColor: theme.scaffoldBackgroundColor,
        appBar: AppBar(
          backgroundColor: theme.scaffoldBackgroundColor,
          elevation: 0,
          leading: IconButton(
            icon: Icon(Icons.arrow_back, color: primaryTextColor),
            onPressed: () {
              if (context.canPop()) {
                context.pop();
              } else {
                context.go('/home');
              }
            },
          ),
        ),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Brand Wordmark
                    Center(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'FLASH',
                            style: GoogleFonts.sora(fontSize: 24, fontWeight: FontWeight.w800, color: C.text),
                          ),
                          const SizedBox(width: 5),
                          Container(width: 8, height: 8, decoration: const BoxDecoration(color: C.amber, shape: BoxShape.circle)),
                          const SizedBox(width: 5),
                          Text(
                            'SALE',
                            style: GoogleFonts.sora(fontSize: 24, fontWeight: FontWeight.w400, color: C.textDim),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      'Identity Access',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.sora(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: C.text,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Sign in to access real-time commodity trading drops.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.manrope(fontSize: 13, color: C.textMute),
                    ),
                    const SizedBox(height: 32),

                    // Email Field
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      style: GoogleFonts.jetBrainsMono(fontSize: 13, color: C.text),
                      decoration: const InputDecoration(
                        labelText: 'Email Address',
                        prefixIcon: Icon(Icons.mail_outline, size: 18, color: C.textMute),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) return 'Email is required';
                        if (!value.contains('@')) return 'Enter a valid email';
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),

                    // Password Field
                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      style: GoogleFonts.jetBrainsMono(fontSize: 13, color: C.text),
                      decoration: InputDecoration(
                        labelText: 'Password',
                        prefixIcon: const Icon(Icons.lock_outline, size: 18, color: C.textMute),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                            size: 18,
                            color: C.textMute,
                          ),
                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        ),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) return 'Password is required';
                        return null;
                      },
                    ),
                    const SizedBox(height: 8),

                    // Forgot Password
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () => context.push('/forgot-password'),
                        child: Text(
                          'Forgot Password?',
                          style: GoogleFonts.manrope(
                            color: C.amber,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Submit Button
                    BlocBuilder<AuthBloc, AuthState>(
                      builder: (context, state) {
                        final isLoading = state is AuthLoading;
                        return ElevatedButton(
                          onPressed: isLoading ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: C.amber,
                            foregroundColor: C.onAmber,
                            minimumSize: const Size.fromHeight(48),
                          ),
                          child: isLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: C.onAmber),
                                )
                              : Text(
                                  'AUTHENTICATE →',
                                  style: GoogleFonts.manrope(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                        );
                      },
                    ),
                    const SizedBox(height: 24),

                    // Register Link
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'No account record? ',
                          style: GoogleFonts.manrope(color: C.textMute, fontSize: 13),
                        ),
                        GestureDetector(
                          onTap: () => context.push('/register'),
                          child: Text(
                            'Register Here',
                            style: GoogleFonts.manrope(
                              color: C.amber,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Guest Escape Hatch Button
                    OutlinedButton.icon(
                      onPressed: () => context.go('/home'),
                      icon: Icon(Icons.storefront, size: 16, color: isDark ? C.darkTextDim : const Color(0xFF4B5563)),
                      label: Text(
                        'CONTINUE AS GUEST',
                        style: GoogleFonts.manrope(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: isDark ? C.darkTextDim : const Color(0xFF4B5563),
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: isDark ? C.darkLine : const Color(0xFFE5E7EB)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
