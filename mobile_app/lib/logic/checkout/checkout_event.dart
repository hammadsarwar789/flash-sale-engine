import 'package:equatable/equatable.dart';

abstract class CheckoutEvent extends Equatable {
  const CheckoutEvent();
  @override
  List<Object?> get props => [];
}

class InitiateCheckoutEvent extends CheckoutEvent {
  final String? couponCode;
  final String? shippingAddressId;
  final Map<String, dynamic>? shippingAddress;
  final String? paymentMethod;
  final List<Map<String, dynamic>>? items;
  final List<String>? reservationIds;
  final String? customIdempotencyKey;

  const InitiateCheckoutEvent({
    this.couponCode,
    this.shippingAddressId,
    this.shippingAddress,
    this.paymentMethod,
    this.items,
    this.reservationIds,
    this.customIdempotencyKey,
  });

  @override
  List<Object?> get props => [
        couponCode,
        shippingAddressId,
        shippingAddress,
        paymentMethod,
        items,
        reservationIds,
        customIdempotencyKey,
      ];
}

class ProceedToSettlementEvent extends CheckoutEvent {
  final String? couponCode;
  final String? shippingAddressId;
  final Map<String, dynamic>? shippingAddress;
  final String? paymentMethod;
  final List<Map<String, dynamic>>? items;
  final List<String>? reservationIds;
  final String? customIdempotencyKey;

  const ProceedToSettlementEvent({
    this.couponCode,
    this.shippingAddressId,
    this.shippingAddress,
    this.paymentMethod,
    this.items,
    this.reservationIds,
    this.customIdempotencyKey,
  });

  @override
  List<Object?> get props => [
        couponCode,
        shippingAddressId,
        shippingAddress,
        paymentMethod,
        items,
        reservationIds,
        customIdempotencyKey,
      ];
}
