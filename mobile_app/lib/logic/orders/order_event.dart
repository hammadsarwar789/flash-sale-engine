import 'package:equatable/equatable.dart';

abstract class OrderEvent extends Equatable {
  const OrderEvent();
  @override
  List<Object?> get props => [];
}

class LoadOrdersEvent extends OrderEvent {}

class ReserveFlashSaleEvent extends OrderEvent {
  final int productId;
  final int quantity;
  final String? customIdempotencyKey;

  const ReserveFlashSaleEvent({
    required this.productId,
    this.quantity = 1,
    this.customIdempotencyKey,
  });

  @override
  List<Object?> get props => [productId, quantity, customIdempotencyKey];
}

class PayOrderEvent extends OrderEvent {
  final int orderId;
  final String paymentMethod;

  const PayOrderEvent({
    required this.orderId,
    this.paymentMethod = 'card',
  });

  @override
  List<Object?> get props => [orderId, paymentMethod];
}
