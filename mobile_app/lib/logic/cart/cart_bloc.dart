import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile_app/data/repositories/cart_repository.dart';
import 'package:mobile_app/logic/cart/cart_event.dart';
import 'package:mobile_app/logic/cart/cart_state.dart';

class CartBloc extends Bloc<CartEvent, CartState> {
  final CartRepository cartRepository;

  CartBloc({required this.cartRepository})
      : super(CartInitial()) {
    on<LoadCartEvent>(_onLoadCart);
    on<AddToCartEvent>(_onAddToCart);
    on<UpdateCartItemQuantityEvent>(_onUpdateQuantity);
    on<RemoveCartItemEvent>(_onRemoveItem);
    on<ClearCartEvent>(_onClearCart);
    on<SyncCartReservationEvent>(_onSyncCartReservation);
    on<CartReservationExpiredEvent>(_onCartReservationExpired);
  }

  Future<void> _onLoadCart(LoadCartEvent event, Emitter<CartState> emit) async {
    if (state is! CartLoaded) {
      emit(CartLoading());
    }
    try {
      final cart = await cartRepository.getCart();
      if (cart.items.isNotEmpty && cart.expiresAt != null) {
        final remaining = cart.expiresAt!.toUtc().difference(DateTime.now().toUtc()).inSeconds;
        if (remaining <= 0) {
          emit(const ReservationExpiredState());
        }
      }
      emit(CartLoaded(cart: cart));
    } catch (e) {
      emit(CartError(e.toString()));
    }
  }

  Future<void> _onAddToCart(AddToCartEvent event, Emitter<CartState> emit) async {
    try {
      int effectiveQuantity = event.quantity;
      if (event.product != null) {
        final available = event.product!.getStockForVariant(event.variantId);
        if (available > 0 && effectiveQuantity > available) {
          effectiveQuantity = available;
        }
      }
      await cartRepository.addToCart(
        productId: event.productId,
        quantity: effectiveQuantity,
        variantId: event.variantId,
        product: event.product,
      );
      final cart = await cartRepository.getCart();
      emit(CartLoaded(cart: cart));
    } catch (e) {
      emit(CartError(e.toString()));
    }
  }

  Future<void> _onUpdateQuantity(UpdateCartItemQuantityEvent event, Emitter<CartState> emit) async {
    try {
      if (event.quantity <= 0) {
        await cartRepository.removeFromCart(event.itemId);
      } else {
        int targetQuantity = event.quantity;
        if (state is CartLoaded) {
          final item = (state as CartLoaded).cart.items.where((i) => i.id.toString() == event.itemId.toString()).firstOrNull;
          if (item != null && item.availableStock > 0 && targetQuantity > item.availableStock) {
            targetQuantity = item.availableStock;
          }
        }
        await cartRepository.updateQuantity(itemId: event.itemId, quantity: targetQuantity);
      }
      final cart = await cartRepository.getCart();
      emit(CartLoaded(cart: cart));
    } catch (e) {
      emit(CartError(e.toString()));
    }
  }

  Future<void> _onRemoveItem(RemoveCartItemEvent event, Emitter<CartState> emit) async {
    try {
      await cartRepository.removeFromCart(event.itemId);
      final cart = await cartRepository.getCart();
      emit(CartLoaded(cart: cart));
    } catch (e) {
      emit(CartError(e.toString()));
    }
  }

  Future<void> _onClearCart(ClearCartEvent event, Emitter<CartState> emit) async {
    try {
      await cartRepository.clearCart();
      final cart = await cartRepository.getCart();
      emit(CartLoaded(cart: cart));
    } catch (e) {
      emit(CartError(e.toString()));
    }
  }

  Future<void> _onSyncCartReservation(SyncCartReservationEvent event, Emitter<CartState> emit) async {
    final currentState = state;
    if (currentState is CartLoaded && currentState.cart.items.isNotEmpty && currentState.cart.expiresAt != null) {
      final remaining = currentState.cart.expiresAt!.toUtc().difference(DateTime.now().toUtc()).inSeconds;
      if (remaining <= 0) {
        emit(const ReservationExpiredState());
        add(LoadCartEvent());
        return;
      }
    }
    // Refresh cart from server to get accurate hold state
    add(LoadCartEvent());
  }

  Future<void> _onCartReservationExpired(CartReservationExpiredEvent event, Emitter<CartState> emit) async {
    emit(const ReservationExpiredState());
    add(LoadCartEvent());
  }
}
