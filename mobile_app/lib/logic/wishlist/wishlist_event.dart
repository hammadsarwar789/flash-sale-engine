import 'package:equatable/equatable.dart';
import 'package:mobile_app/data/models/product_model.dart';

abstract class WishlistEvent extends Equatable {
  const WishlistEvent();
  @override
  List<Object?> get props => [];
}

class LoadWishlistEvent extends WishlistEvent {}

class AddToWishlistEvent extends WishlistEvent {
  final dynamic productId;
  final ProductModel? product;
  const AddToWishlistEvent(this.productId, {this.product});

  @override
  List<Object?> get props => [productId, product];
}

class RemoveFromWishlistEvent extends WishlistEvent {
  final dynamic itemId;
  const RemoveFromWishlistEvent(this.itemId);

  @override
  List<Object?> get props => [itemId];
}

class ToggleWishlistEvent extends WishlistEvent {
  final dynamic productId;
  final ProductModel? product;
  const ToggleWishlistEvent(this.productId, {this.product});

  @override
  List<Object?> get props => [productId, product];
}
