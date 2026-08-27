import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile_app/data/repositories/auth_repository.dart';
import 'package:mobile_app/logic/auth/auth_event.dart';
import 'package:mobile_app/logic/auth/auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;

  AuthBloc({required AuthRepository authRepository})
      : _authRepository = authRepository,
        super(AuthInitial()) {
    on<AppStartedEvent>(_onAppStarted);
    on<LoginSubmittedEvent>(_onLoginSubmitted);
    on<RegisterSubmittedEvent>(_onRegisterSubmitted);
    on<LogoutEvent>(_onLogout);
  }

  Future<void> _onAppStarted(AppStartedEvent event, Emitter<AuthState> emit) async {
    try {
      final token = await _authRepository.getToken();
      if (token != null && token.isNotEmpty) {
        final user = await _authRepository.getCurrentUser();
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
      final authResponse = await _authRepository.login(
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
      await _authRepository.register(
        email: event.email,
        password: event.password,
        fullName: event.fullName,
      );
      emit(const RegisterSuccess());
    } catch (e) {
      emit(AuthFailure(message: e.toString()));
    }
  }

  Future<void> _onLogout(LogoutEvent event, Emitter<AuthState> emit) async {
    await _authRepository.logout();
    emit(Unauthenticated());
  }
}
