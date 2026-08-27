import 'package:equatable/equatable.dart';
import 'package:mobile_app/data/models/order_model.dart';

abstract class OrderState extends Equatable {
  const OrderState();
  @override
  List<Object?> get props => [];
}

class OrderInitial extends OrderState {}

class OrderLoading extends OrderState {}

class OrdersLoaded extends OrderState {
  final List<OrderModel> orders;
  const OrdersLoaded(this.orders);

  @override
  List<Object?> get props => [orders];
}

class ReservationInProgress extends OrderState {
  final int productId;
  const ReservationInProgress(this.productId);

  @override
  List<Object?> get props => [productId];
}

class ReservationSuccess extends OrderState {
  final ReservationResponse response;
  const ReservationSuccess(this.response);

  @override
  List<Object?> get props => [response];
}

class PaymentSuccess extends OrderState {
  final int orderId;
  const PaymentSuccess(this.orderId);

  @override
  List<Object?> get props => [orderId];
}

class OrderError extends OrderState {
  final String message;
  const OrderError(this.message);

  @override
  List<Object?> get props => [message];
}
