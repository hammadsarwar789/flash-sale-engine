import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile_app/data/models/wishlist_model.dart';
import 'package:mobile_app/data/repositories/wishlist_repository.dart';
import 'package:mobile_app/logic/wishlist/wishlist_event.dart';
import 'package:mobile_app/logic/wishlist/wishlist_state.dart';

class WishlistBloc extends Bloc<WishlistEvent, WishlistState> {
  final WishlistRepository wishlistRepository;

  WishlistBloc({required this.wishlistRepository})
      : super(WishlistInitial()) {
    on<LoadWishlistEvent>(_onLoadWishlist);
    on<AddToWishlistEvent>(_onAddToWishlist);
    on<RemoveFromWishlistEvent>(_onRemoveFromWishlist);
    on<ToggleWishlistEvent>(_onToggleWishlist);
  }

  Future<void> _onLoadWishlist(LoadWishlistEvent event, Emitter<WishlistState> emit) async {
    if (state is! WishlistLoaded) {
      emit(WishlistLoading());
    }
    try {
      final items = await wishlistRepository.getWishlist();
      emit(WishlistLoaded(items: items));
    } catch (e) {
      emit(WishlistError(e.toString()));
    }
  }

  Future<void> _onAddToWishlist(AddToWishlistEvent event, Emitter<WishlistState> emit) async {
    try {
      await wishlistRepository.addToWishlist(event.productId, event.product);
      final items = await wishlistRepository.getWishlist();
      emit(WishlistLoaded(items: items));
    } catch (e) {
      emit(WishlistError(e.toString()));
    }
  }

  Future<void> _onRemoveFromWishlist(RemoveFromWishlistEvent event, Emitter<WishlistState> emit) async {
    try {
      await wishlistRepository.removeFromWishlist(event.itemId);
      final items = await wishlistRepository.getWishlist();
      emit(WishlistLoaded(items: items));
    } catch (e) {
      emit(WishlistError(e.toString()));
    }
  }

  Future<void> _onToggleWishlist(ToggleWishlistEvent event, Emitter<WishlistState> emit) async {
    final currentState = state;
    if (currentState is WishlistLoaded) {
      final existingItem = currentState.items.cast<WishlistItemModel?>().firstWhere(
        (item) => item?.productId.toString() == event.productId.toString(),
        orElse: () => null,
      );
      if (existingItem != null) {
        await _onRemoveFromWishlist(RemoveFromWishlistEvent(existingItem.id), emit);
      } else {
        await _onAddToWishlist(AddToWishlistEvent(event.productId, product: event.product), emit);
      }
    } else {
      await _onAddToWishlist(AddToWishlistEvent(event.productId, product: event.product), emit);
    }
  }
}
