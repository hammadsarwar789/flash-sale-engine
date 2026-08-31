import 'package:equatable/equatable.dart';

abstract class WishlistEvent extends Equatable {
  const WishlistEvent();
  @override
  List<Object?> get props => [];
}

class LoadWishlistEvent extends WishlistEvent {}

class AddToWishlistEvent extends WishlistEvent {
  final dynamic productId;
  const AddToWishlistEvent(this.productId);

  @override
  List<Object?> get props => [productId];
}

class RemoveFromWishlistEvent extends WishlistEvent {
  final dynamic itemId;
  const RemoveFromWishlistEvent(this.itemId);

  @override
  List<Object?> get props => [itemId];
}
