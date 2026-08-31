import 'package:equatable/equatable.dart';
import 'package:mobile_app/data/models/wishlist_model.dart';

abstract class WishlistState extends Equatable {
  const WishlistState();
  @override
  List<Object?> get props => [];
}

class WishlistInitial extends WishlistState {}

class WishlistLoading extends WishlistState {}

class WishlistLoaded extends WishlistState {
  final List<WishlistItemModel> items;

  const WishlistLoaded({this.items = const []});

  bool isProductWishlisted(dynamic productId) {
    return items.any((item) => item.productId.toString() == productId.toString());
  }

  String? getWishlistItemId(dynamic productId) {
    try {
      return items.firstWhere((item) => item.productId.toString() == productId.toString()).id;
    } catch (_) {
      return null;
    }
  }

  @override
  List<Object?> get props => [items];
}

class WishlistError extends WishlistState {
  final String message;
  const WishlistError(this.message);

  @override
  List<Object?> get props => [message];
}
