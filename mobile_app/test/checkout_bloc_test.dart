import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/data/models/order_model.dart';
import 'package:mobile_app/data/repositories/order_repository.dart';
import 'package:mobile_app/logic/checkout/checkout_bloc.dart';
import 'package:mobile_app/logic/checkout/checkout_event.dart';
import 'package:mobile_app/logic/checkout/checkout_state.dart';

class MockOrderRepositorySuccess extends OrderRepository {
  final OrderModel dummyOrder;
  MockOrderRepositorySuccess(this.dummyOrder);

  @override
  Future<OrderModel> checkoutCart({
    String? couponCode,
    String? shippingAddressId,
    Map<String, dynamic>? shippingAddress,
    String? paymentMethod,
    List<Map<String, dynamic>>? items,
    List<String>? reservationIds,
    String? customIdempotencyKey,
  }) async {
    return dummyOrder;
  }
}

class MockOrderRepositoryFailure extends OrderRepository {
  final String errorMessage;
  MockOrderRepositoryFailure(this.errorMessage);

  @override
  Future<OrderModel> checkoutCart({
    String? couponCode,
    String? shippingAddressId,
    Map<String, dynamic>? shippingAddress,
    String? paymentMethod,
    List<Map<String, dynamic>>? items,
    List<String>? reservationIds,
    String? customIdempotencyKey,
  }) async {
    throw Exception(errorMessage);
  }
}

void main() {
  group('CheckoutBloc Tests', () {
    const dummyOrder = OrderModel(
      id: 999,
      userId: 42,
      totalAmount: 159.99,
      status: 'pending',
    );

    test('emits [CheckoutLoading, CheckoutSuccess] on successful settlement', () async {
      final repo = MockOrderRepositorySuccess(dummyOrder);
      final bloc = CheckoutBloc(orderRepository: repo);

      final expectedStates = [
        CheckoutLoading(),
        const CheckoutSuccess(order: dummyOrder),
      ];

      expectLater(bloc.stream, emitsInOrder(expectedStates));

      bloc.add(const ProceedToSettlementEvent(
        couponCode: 'FLASH10',
        paymentMethod: 'card',
      ));
    });

    test('emits [CheckoutLoading, CheckoutFailure] with actual error message on API failure', () async {
      const errorMsg = 'Reservation expired for variant_101';
      final repo = MockOrderRepositoryFailure(errorMsg);
      final bloc = CheckoutBloc(orderRepository: repo);

      expectLater(
        bloc.stream,
        emitsInOrder([
          CheckoutLoading(),
          predicate<CheckoutState>((state) {
            return state is CheckoutFailure && state.message.contains(errorMsg);
          }),
        ]),
      );

      bloc.add(const ProceedToSettlementEvent(
        couponCode: 'FLASH10',
        paymentMethod: 'card',
      ));
    });
  });
}
