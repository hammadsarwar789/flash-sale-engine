import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/logic/auth/auth_bloc.dart';
import 'package:mobile_app/logic/auth/auth_event.dart';
import 'package:mobile_app/logic/auth/auth_state.dart';

class ResetPasswordScreen extends StatefulWidget {
  final String? initialToken;

  const ResetPasswordScreen({super.key, this.initialToken});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _tokenController;
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _tokenController = TextEditingController(text: widget.initialToken ?? '');
  }

  @override
  void dispose() {
    _tokenController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState?.validate() ?? false) {
      context.read<AuthBloc>().add(
            ResetPasswordEvent(
              token: _tokenController.text.trim(),
              newPassword: _passwordController.text,
            ),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is PasswordResetSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message, style: GoogleFonts.manrope(color: C.onMint)),
              backgroundColor: C.mint,
            ),
          );
          context.go('/login');
        } else if (state is AuthFailure) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message, style: GoogleFonts.manrope(color: C.text)),
              backgroundColor: C.rose,
            ),
          );
        }
      },
      child: Scaffold(
        backgroundColor: C.base,
        appBar: AppBar(
          backgroundColor: C.surface,
          title: Text(
            'Set New Password',
            style: GoogleFonts.sora(fontSize: 16, fontWeight: FontWeight.w700, color: C.text),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: C.text),
            onPressed: () => context.pop(),
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
                    Center(
                      child: Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: C.raised,
                          borderRadius: BorderRadius.circular(C.radiusCard),
                          border: Border.all(color: C.line),
                        ),
                        child: const Icon(Icons.password, color: C.amber, size: 32),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Update Password',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.sora(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: C.text,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Enter your recovery token and define a new secure password.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.manrope(fontSize: 13, color: C.textMute),
                    ),
                    const SizedBox(height: 28),

                    // Token Field
                    TextFormField(
                      controller: _tokenController,
                      style: GoogleFonts.jetBrainsMono(fontSize: 13, color: C.text),
                      decoration: const InputDecoration(
                        labelText: 'Recovery Token',
                        prefixIcon: Icon(Icons.key, color: C.textMute, size: 18),
                        hintText: 'reset-xxx',
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) return 'Token is required';
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),

                    // New Password Field
                    TextFormField(
                      controller: _passwordController,
                      obscureText: _obscurePassword,
                      style: GoogleFonts.jetBrainsMono(fontSize: 13, color: C.text),
                      decoration: InputDecoration(
                        labelText: 'New Password',
                        prefixIcon: const Icon(Icons.lock_outline, color: C.textMute, size: 18),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                            color: C.textMute,
                            size: 18,
                          ),
                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        ),
                      ),
                      validator: (val) {
                        if (val == null || val.isEmpty) return 'Password is required';
                        if (val.length < 6) return 'Must be at least 6 characters';
                        return null;
                      },
                    ),
                    const SizedBox(height: 14),

                    // Confirm Password Field
                    TextFormField(
                      controller: _confirmPasswordController,
                      obscureText: _obscurePassword,
                      style: GoogleFonts.jetBrainsMono(fontSize: 13, color: C.text),
                      decoration: const InputDecoration(
                        labelText: 'Confirm New Password',
                        prefixIcon: Icon(Icons.lock_reset, color: C.textMute, size: 18),
                      ),
                      validator: (val) {
                        if (val != _passwordController.text) return 'Passwords do not match';
                        return null;
                      },
                    ),
                    const SizedBox(height: 24),

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
                                  'CONFIRM NEW PASSWORD',
                                  style: GoogleFonts.manrope(fontWeight: FontWeight.bold, fontSize: 13),
                                ),
                        );
                      },
                    ),
                    const SizedBox(height: 16),

                    Center(
                      child: GestureDetector(
                        onTap: () => context.go('/login'),
                        child: Text(
                          '← Return to Sign In',
                          style: GoogleFonts.manrope(color: C.textMute, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
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
