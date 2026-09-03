import 'package:equatable/equatable.dart';
import 'package:mobile_app/data/models/order_model.dart';

abstract class CheckoutState extends Equatable {
  const CheckoutState();
  @override
  List<Object?> get props => [];
}

class CheckoutInitial extends CheckoutState {}

class CheckoutLoading extends CheckoutState {}

class CheckoutSuccess extends CheckoutState {
  final OrderModel order;
  const CheckoutSuccess({required this.order});

  @override
  List<Object?> get props => [order];
}

class CheckoutFailure extends CheckoutState {
  final String message;
  const CheckoutFailure(this.message);

  @override
  List<Object?> get props => [message];
}
