import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile_app/data/repositories/wishlist_repository.dart';
import 'package:mobile_app/logic/wishlist/wishlist_event.dart';
import 'package:mobile_app/logic/wishlist/wishlist_state.dart';

class WishlistBloc extends Bloc<WishlistEvent, WishlistState> {
  final WishlistRepository _wishlistRepository;

  WishlistBloc({required WishlistRepository wishlistRepository})
      : _wishlistRepository = wishlistRepository,
        super(WishlistInitial()) {
    on<LoadWishlistEvent>(_onLoadWishlist);
    on<AddToWishlistEvent>(_onAddToWishlist);
    on<RemoveFromWishlistEvent>(_onRemoveFromWishlist);
  }

  Future<void> _onLoadWishlist(LoadWishlistEvent event, Emitter<WishlistState> emit) async {
    if (state is! WishlistLoaded) {
      emit(WishlistLoading());
    }
    try {
      final items = await _wishlistRepository.getWishlist();
      emit(WishlistLoaded(items: items));
    } catch (e) {
      emit(WishlistError(e.toString()));
    }
  }

  Future<void> _onAddToWishlist(AddToWishlistEvent event, Emitter<WishlistState> emit) async {
    try {
      await _wishlistRepository.addToWishlist(event.productId);
      final items = await _wishlistRepository.getWishlist();
      emit(WishlistLoaded(items: items));
    } catch (e) {
      emit(WishlistError(e.toString()));
    }
  }

  Future<void> _onRemoveFromWishlist(RemoveFromWishlistEvent event, Emitter<WishlistState> emit) async {
    try {
      await _wishlistRepository.removeFromWishlist(event.itemId);
      final items = await _wishlistRepository.getWishlist();
      emit(WishlistLoaded(items: items));
    } catch (e) {
      emit(WishlistError(e.toString()));
    }
  }
}
