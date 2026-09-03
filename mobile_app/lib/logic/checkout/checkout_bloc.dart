import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile_app/data/models/order_model.dart';
import 'package:mobile_app/data/repositories/order_repository.dart';
import 'package:mobile_app/logic/checkout/checkout_event.dart';
import 'package:mobile_app/logic/checkout/checkout_state.dart';

class CheckoutBloc extends Bloc<CheckoutEvent, CheckoutState> {
  final OrderRepository orderRepository;

  CheckoutBloc({required this.orderRepository}) : super(CheckoutInitial()) {
    on<InitiateCheckoutEvent>(_onCheckout);
    on<ProceedToSettlementEvent>(_onCheckout);
  }

  Future<void> _onCheckout(CheckoutEvent event, Emitter<CheckoutState> emit) async {
    emit(CheckoutLoading());
    try {
      String? couponCode;
      String? shippingAddressId;
      Map<String, dynamic>? shippingAddress;
      String? paymentMethod;
      List<Map<String, dynamic>>? items;
      List<String>? reservationIds;
      String? customIdempotencyKey;

      if (event is InitiateCheckoutEvent) {
        couponCode = event.couponCode;
        shippingAddressId = event.shippingAddressId;
        shippingAddress = event.shippingAddress;
        paymentMethod = event.paymentMethod;
        items = event.items;
        reservationIds = event.reservationIds;
        customIdempotencyKey = event.customIdempotencyKey;
      } else if (event is ProceedToSettlementEvent) {
        couponCode = event.couponCode;
        shippingAddressId = event.shippingAddressId;
        shippingAddress = event.shippingAddress;
        paymentMethod = event.paymentMethod;
        items = event.items;
        reservationIds = event.reservationIds;
        customIdempotencyKey = event.customIdempotencyKey;
      }

      final OrderModel order = await orderRepository.checkoutCart(
        couponCode: couponCode,
        shippingAddressId: shippingAddressId,
        shippingAddress: shippingAddress,
        paymentMethod: paymentMethod,
        items: items,
        reservationIds: reservationIds,
        customIdempotencyKey: customIdempotencyKey,
      );

      // If a payment method is specified, trigger payment
      if (paymentMethod != null && paymentMethod.isNotEmpty) {
        try {
          await orderRepository.payOrder(
            orderId: order.id,
            paymentMethod: paymentMethod,
          );
        } catch (_) {}
      }

      emit(CheckoutSuccess(order: order));
    } on DioException catch (e) {
      final msg = e.response?.data is Map && e.response?.data['detail'] != null
          ? e.response!.data['detail'].toString()
          : (e.message ?? 'Checkout settlement failed');
      emit(CheckoutFailure(msg));
    } catch (e) {
      emit(CheckoutFailure(e.toString()));
    }
  }
}
