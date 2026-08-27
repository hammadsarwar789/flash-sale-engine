import 'package:equatable/equatable.dart';

class UserModel extends Equatable {
  final int id;
  final String email;
  final String? fullName;
  final String role;
  final bool isActive;
  final bool isEmailVerified;

  const UserModel({
    required this.id,
    required this.email,
    this.fullName,
    required this.role,
    this.isActive = true,
    this.isEmailVerified = false,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      email: json['email'] as String? ?? '',
      fullName: json['full_name'] as String?,
      role: json['role'] as String? ?? 'customer',
      isActive: json['is_active'] as bool? ?? true,
      isEmailVerified: json['is_email_verified'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'full_name': fullName,
      'role': role,
      'is_active': isActive,
      'is_email_verified': isEmailVerified,
    };
  }

  @override
  List<Object?> get props => [id, email, fullName, role, isActive, isEmailVerified];
}

class AuthResponse extends Equatable {
  final String accessToken;
  final String tokenType;
  final UserModel? user;

  const AuthResponse({
    required this.accessToken,
    this.tokenType = 'Bearer',
    this.user,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      accessToken: json['access_token'] as String? ?? json['token'] as String? ?? '',
      tokenType: json['token_type'] as String? ?? 'Bearer',
      user: json['user'] != null ? UserModel.fromJson(json['user'] as Map<String, dynamic>) : null,
    );
  }

  @override
  List<Object?> get props => [accessToken, tokenType, user];
}
