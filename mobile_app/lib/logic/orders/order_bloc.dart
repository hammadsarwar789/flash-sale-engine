import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile_app/data/repositories/order_repository.dart';
import 'package:mobile_app/logic/orders/order_event.dart';
import 'package:mobile_app/logic/orders/order_state.dart';

class OrderBloc extends Bloc<OrderEvent, OrderState> {
  final OrderRepository orderRepository;

  OrderBloc({required this.orderRepository})
      : super(OrderInitial()) {
    on<LoadOrdersEvent>(_onLoadOrders);
    on<ReserveFlashSaleEvent>(_onReserveFlashSale);
    on<PayOrderEvent>(_onPayOrder);
  }

  Future<void> _onLoadOrders(LoadOrdersEvent event, Emitter<OrderState> emit) async {
    emit(OrderLoading());
    try {
      final orders = await orderRepository.getOrders();
      emit(OrdersLoaded(orders));
    } catch (e) {
      emit(OrderError(e.toString()));
    }
  }

  Future<void> _onReserveFlashSale(ReserveFlashSaleEvent event, Emitter<OrderState> emit) async {
    emit(ReservationInProgress(event.productId));
    try {
      final response = await orderRepository.reserveFlashSaleItem(
        productId: event.productId,
        quantity: event.quantity,
        customIdempotencyKey: event.customIdempotencyKey,
      );
      emit(ReservationSuccess(response));
    } catch (e) {
      emit(OrderError(e.toString()));
    }
  }

  Future<void> _onPayOrder(PayOrderEvent event, Emitter<OrderState> emit) async {
    emit(OrderLoading());
    try {
      await orderRepository.payOrder(
        orderId: event.orderId,
        paymentMethod: event.paymentMethod,
      );
      emit(PaymentSuccess(event.orderId));
    } catch (e) {
      emit(OrderError(e.toString()));
    }
  }
}
