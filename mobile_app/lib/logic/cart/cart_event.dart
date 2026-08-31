import 'package:equatable/equatable.dart';

abstract class CartEvent extends Equatable {
  const CartEvent();
  @override
  List<Object?> get props => [];
}

class LoadCartEvent extends CartEvent {}

class AddToCartEvent extends CartEvent {
  final int productId;
  final int quantity;
  final int? variantId;

  const AddToCartEvent({
    required this.productId,
    this.quantity = 1,
    this.variantId,
  });

  @override
  List<Object?> get props => [productId, quantity, variantId];
}

class UpdateCartItemQuantityEvent extends CartEvent {
  final int itemId;
  final int quantity;

  const UpdateCartItemQuantityEvent({
    required this.itemId,
    required this.quantity,
  });

  @override
  List<Object?> get props => [itemId, quantity];
}

class RemoveCartItemEvent extends CartEvent {
  final int itemId;

  const RemoveCartItemEvent(this.itemId);

  @override
  List<Object?> get props => [itemId];
}

class ClearCartEvent extends CartEvent {}
