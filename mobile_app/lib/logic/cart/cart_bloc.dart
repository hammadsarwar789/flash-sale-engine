import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile_app/data/repositories/cart_repository.dart';
import 'package:mobile_app/logic/cart/cart_event.dart';
import 'package:mobile_app/logic/cart/cart_state.dart';

class CartBloc extends Bloc<CartEvent, CartState> {
  final CartRepository _cartRepository;

  CartBloc({required CartRepository cartRepository})
      : _cartRepository = cartRepository,
        super(CartInitial()) {
    on<LoadCartEvent>(_onLoadCart);
    on<AddToCartEvent>(_onAddToCart);
    on<UpdateCartItemQuantityEvent>(_onUpdateQuantity);
    on<RemoveCartItemEvent>(_onRemoveItem);
    on<ClearCartEvent>(_onClearCart);
  }

  Future<void> _onLoadCart(LoadCartEvent event, Emitter<CartState> emit) async {
    if (state is! CartLoaded) {
      emit(CartLoading());
    }
    try {
      final cart = await _cartRepository.getCart();
      emit(CartLoaded(cart: cart));
    } catch (e) {
      emit(CartError(e.toString()));
    }
  }

  Future<void> _onAddToCart(AddToCartEvent event, Emitter<CartState> emit) async {
    try {
      await _cartRepository.addToCart(
        productId: event.productId,
        quantity: event.quantity,
        variantId: event.variantId,
      );
      final cart = await _cartRepository.getCart();
      emit(const CartActionSuccess('Added to cart!'));
      emit(CartLoaded(cart: cart));
    } catch (e) {
      emit(CartError(e.toString()));
    }
  }

  Future<void> _onUpdateQuantity(UpdateCartItemQuantityEvent event, Emitter<CartState> emit) async {
    try {
      if (event.quantity <= 0) {
        await _cartRepository.removeFromCart(event.itemId);
      } else {
        await _cartRepository.updateQuantity(itemId: event.itemId, quantity: event.quantity);
      }
      final cart = await _cartRepository.getCart();
      emit(CartLoaded(cart: cart));
    } catch (e) {
      emit(CartError(e.toString()));
    }
  }

  Future<void> _onRemoveItem(RemoveCartItemEvent event, Emitter<CartState> emit) async {
    try {
      await _cartRepository.removeFromCart(event.itemId);
      final cart = await _cartRepository.getCart();
      emit(CartLoaded(cart: cart));
    } catch (e) {
      emit(CartError(e.toString()));
    }
  }

  Future<void> _onClearCart(ClearCartEvent event, Emitter<CartState> emit) async {
    try {
      await _cartRepository.clearCart();
      final cart = await _cartRepository.getCart();
      emit(CartLoaded(cart: cart));
    } catch (e) {
      emit(CartError(e.toString()));
    }
  }
}
