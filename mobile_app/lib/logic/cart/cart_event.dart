import 'package:equatable/equatable.dart';
import 'package:mobile_app/data/models/product_model.dart';

abstract class CartEvent extends Equatable {
  const CartEvent();
  @override
  List<Object?> get props => [];
}

class LoadCartEvent extends CartEvent {}

class AddToCartEvent extends CartEvent {
  final dynamic productId;
  final int quantity;
  final dynamic variantId;
  final ProductModel? product;

  const AddToCartEvent({
    required this.productId,
    this.quantity = 1,
    this.variantId,
    this.product,
  });

  @override
  List<Object?> get props => [productId, quantity, variantId, product];
}

class UpdateCartItemQuantityEvent extends CartEvent {
  final dynamic itemId;
  final int quantity;

  const UpdateCartItemQuantityEvent({
    required this.itemId,
    required this.quantity,
  });

  @override
  List<Object?> get props => [itemId, quantity];
}

class RemoveCartItemEvent extends CartEvent {
  final dynamic itemId;

  const RemoveCartItemEvent(this.itemId);

  @override
  List<Object?> get props => [itemId];
}

class ClearCartEvent extends CartEvent {}

class SyncCartReservationEvent extends CartEvent {}

class CartReservationExpiredEvent extends CartEvent {}
