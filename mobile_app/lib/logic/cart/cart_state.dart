import 'package:equatable/equatable.dart';
import 'package:mobile_app/data/models/cart_model.dart';

abstract class CartState extends Equatable {
  const CartState();
  @override
  List<Object?> get props => [];
}

class CartInitial extends CartState {}

class CartLoading extends CartState {}

class CartLoaded extends CartState {
  final CartSummaryModel cart;
  final bool isUpdating;

  const CartLoaded({
    required this.cart,
    this.isUpdating = false,
  });

  CartLoaded copyWith({
    CartSummaryModel? cart,
    bool? isUpdating,
  }) {
    return CartLoaded(
      cart: cart ?? this.cart,
      isUpdating: isUpdating ?? this.isUpdating,
    );
  }

  @override
  List<Object?> get props => [cart, isUpdating];
}

class CartError extends CartState {
  final String message;
  const CartError(this.message);

  @override
  List<Object?> get props => [message];
}

class CartActionSuccess extends CartState {
  final String message;
  const CartActionSuccess(this.message);

  @override
  List<Object?> get props => [message];
}

class ReservationExpiredState extends CartState {
  final String message;
  const ReservationExpiredState({this.message = 'Reservation hold expired. Held inventory has been returned.'});

  @override
  List<Object?> get props => [message];
}
