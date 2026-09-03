import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile_app/data/repositories/auth_repository.dart';
import 'package:mobile_app/logic/auth/auth_event.dart';
import 'package:mobile_app/logic/auth/auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository authRepository;

  AuthBloc({required this.authRepository})
      : super(AuthInitial()) {
    on<AppStartedEvent>(_onAppStarted);
    on<LoginSubmittedEvent>(_onLoginSubmitted);
    on<RegisterSubmittedEvent>(_onRegisterSubmitted);
    on<LogoutEvent>(_onLogout);
    on<ForgotPasswordEvent>(_onForgotPassword);
    on<ResetPasswordEvent>(_onResetPassword);
  }

  Future<void> _onAppStarted(AppStartedEvent event, Emitter<AuthState> emit) async {
    try {
      final token = await authRepository.getToken();
      if (token != null && token.isNotEmpty) {
        final user = await authRepository.getCurrentUser();
        emit(Authenticated(token: token, user: user));
      } else {
        emit(Unauthenticated());
      }
    } catch (_) {
      emit(Unauthenticated());
    }
  }

  Future<void> _onLoginSubmitted(LoginSubmittedEvent event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final authResponse = await authRepository.login(
        email: event.email,
        password: event.password,
      );
      emit(Authenticated(token: authResponse.accessToken, user: authResponse.user));
    } catch (e) {
      emit(AuthFailure(message: e.toString()));
    }
  }

  Future<void> _onRegisterSubmitted(RegisterSubmittedEvent event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await authRepository.register(
        email: event.email,
        password: event.password,
        fullName: event.fullName,
        role: event.role,
      );
      emit(const RegisterSuccess());
    } catch (e) {
      emit(AuthFailure(message: e.toString()));
    }
  }

  Future<void> _onLogout(LogoutEvent event, Emitter<AuthState> emit) async {
    await authRepository.logout();
    emit(Unauthenticated());
  }

  Future<void> _onForgotPassword(ForgotPasswordEvent event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final result = await authRepository.forgotPassword(email: event.email);
      final message = result['message'] as String? ?? 'Password reset instructions sent.';
      final resetToken = result['reset_token'] as String?;
      emit(PasswordResetRequestSuccess(message: message, resetToken: resetToken));
    } catch (e) {
      emit(AuthFailure(message: e.toString()));
    }
  }

  Future<void> _onResetPassword(ResetPasswordEvent event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await authRepository.resetPassword(
        token: event.token,
        newPassword: event.newPassword,
      );
      emit(const PasswordResetSuccess());
    } catch (e) {
      emit(AuthFailure(message: e.toString()));
    }
  }
}
