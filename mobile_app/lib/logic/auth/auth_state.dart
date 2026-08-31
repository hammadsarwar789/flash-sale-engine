import 'package:equatable/equatable.dart';
import 'package:mobile_app/data/models/user_model.dart';

abstract class AuthState extends Equatable {
  const AuthState();
  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class Authenticated extends AuthState {
  final UserModel? user;
  final String token;

  const Authenticated({this.user, required this.token});

  @override
  List<Object?> get props => [user, token];
}

class Unauthenticated extends AuthState {}

class AuthFailure extends AuthState {
  final String message;

  const AuthFailure({required this.message});

  @override
  List<Object?> get props => [message];
}

class RegisterSuccess extends AuthState {
  final String message;

  const RegisterSuccess({this.message = 'Registration successful! Please login.'});

  @override
  List<Object?> get props => [message];
}

class PasswordResetRequestSuccess extends AuthState {
  final String message;
  final String? resetToken;

  const PasswordResetRequestSuccess({required this.message, this.resetToken});

  @override
  List<Object?> get props => [message, resetToken];
}

class PasswordResetSuccess extends AuthState {
  final String message;

  const PasswordResetSuccess({this.message = 'Password reset successful! Please login.'});

  @override
  List<Object?> get props => [message];
}
