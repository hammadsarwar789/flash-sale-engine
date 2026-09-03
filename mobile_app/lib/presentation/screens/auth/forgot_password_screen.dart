import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:mobile_app/core/theme/tokens.dart';
import 'package:mobile_app/logic/auth/auth_bloc.dart';
import 'package:mobile_app/logic/auth/auth_event.dart';
import 'package:mobile_app/logic/auth/auth_state.dart';
import 'package:mobile_app/presentation/widgets/app_toast.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  String? _resetToken;
  String? _successMessage;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState?.validate() ?? false) {
      context.read<AuthBloc>().add(
            ForgotPasswordEvent(email: _emailController.text.trim()),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is PasswordResetRequestSuccess) {
          setState(() {
            _successMessage = state.message;
            _resetToken = state.resetToken;
          });
        } else if (state is AuthFailure) {
          AppToast.showError(context, state.message);
        }
      },
      child: Scaffold(
        backgroundColor: C.base,
        appBar: AppBar(
          backgroundColor: C.surface,
          title: Text(
            'Reset Credentials',
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
              child: _successMessage != null ? _buildSuccessView() : _buildRequestForm(),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRequestForm() {
    return Form(
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
              child: const Icon(Icons.lock_reset, color: C.amber, size: 32),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Recovery Pipeline',
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
            'Enter your registered email to generate a recovery token.',
            textAlign: TextAlign.center,
            style: GoogleFonts.manrope(fontSize: 13, color: C.textMute),
          ),
          const SizedBox(height: 28),

          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            style: GoogleFonts.jetBrainsMono(fontSize: 13, color: C.text),
            decoration: const InputDecoration(
              labelText: 'Email Address',
              prefixIcon: Icon(Icons.email_outlined, color: C.textMute, size: 18),
            ),
            validator: (val) {
              if (val == null || val.trim().isEmpty) return 'Email is required';
              if (!val.contains('@')) return 'Enter a valid email';
              return null;
            },
          ),
          const SizedBox(height: 20),

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
                        'SEND RECOVERY TOKEN',
                        style: GoogleFonts.manrope(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
              );
            },
          ),
          const SizedBox(height: 16),

          Center(
            child: GestureDetector(
              onTap: () => context.pop(),
              child: Text(
                '← Return to Sign In',
                style: GoogleFonts.manrope(color: C.amber, fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessView() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: C.mintSoft,
              borderRadius: BorderRadius.circular(C.radiusCard),
              border: Border.all(color: C.mint.withValues(alpha: 0.4)),
            ),
            child: const Icon(Icons.check_circle_outline, color: C.mint, size: 32),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          _successMessage ?? '',
          textAlign: TextAlign.center,
          style: GoogleFonts.manrope(fontSize: 14, fontWeight: FontWeight.w600, color: C.mint),
        ),
        if (_resetToken != null) ...[
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: C.surface,
              borderRadius: BorderRadius.circular(C.radiusCard),
              border: Border.all(color: C.line),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'GENERATED RECOVERY TOKEN',
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: C.textMute,
                  ),
                ),
                const SizedBox(height: 6),
                SelectableText(
                  _resetToken!,
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 14,
                    color: C.amber,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: () => context.push('/reset-password', extra: _resetToken),
          style: ElevatedButton.styleFrom(
            backgroundColor: C.amber,
            foregroundColor: C.onAmber,
            minimumSize: const Size.fromHeight(48),
          ),
          child: Text(
            'PROCEED TO RESET FORM',
            style: GoogleFonts.manrope(fontWeight: FontWeight.bold, fontSize: 13),
          ),
        ),
        const SizedBox(height: 14),
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
    );
  }
}
