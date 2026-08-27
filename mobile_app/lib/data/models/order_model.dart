import 'package:equatable/equatable.dart';

class OrderItemModel extends Equatable {
  final int? id;
  final int productId;
  final String productName;
  final int quantity;
  final double unitPrice;
  final double subtotal;

  const OrderItemModel({
    this.id,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    required this.subtotal,
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? ''),
      productId: json['product_id'] is int ? json['product_id'] : int.tryParse(json['product_id']?.toString() ?? '0') ?? 0,
      productName: json['product_name'] as String? ?? '',
      quantity: json['quantity'] is int ? json['quantity'] : int.tryParse(json['quantity']?.toString() ?? '1') ?? 1,
      unitPrice: (json['unit_price'] is num)
          ? (json['unit_price'] as num).toDouble()
          : double.tryParse(json['unit_price']?.toString() ?? '0.0') ?? 0.0,
      subtotal: (json['subtotal'] is num)
          ? (json['subtotal'] as num).toDouble()
          : double.tryParse(json['subtotal']?.toString() ?? '0.0') ?? 0.0,
    );
  }

  @override
  List<Object?> get props => [id, productId, productName, quantity, unitPrice, subtotal];
}

class OrderModel extends Equatable {
  final int id;
  final int userId;
  final int? productId;
  final String? productName;
  final int quantity;
  final double totalAmount;
  final String status;
  final String? idempotencyKey;
  final String? createdAt;
  final String? expiresAt;
  final List<OrderItemModel> items;

  const OrderModel({
    required this.id,
    required this.userId,
    this.productId,
    this.productName,
    this.quantity = 1,
    required this.totalAmount,
    required this.status,
    this.idempotencyKey,
    this.createdAt,
    this.expiresAt,
    this.items = const [],
  });

  bool get isPending => status.toLowerCase() == 'pending';
  bool get isProcessing => status.toLowerCase() == 'processing';
  bool get isCompleted => status.toLowerCase() == 'completed' || status.toLowerCase() == 'paid';
  bool get isCancelled => status.toLowerCase() == 'cancelled' || status.toLowerCase() == 'expired';

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List<dynamic>?;
    final itemsList = rawItems != null
        ? rawItems.map((e) => OrderItemModel.fromJson(e as Map<String, dynamic>)).toList()
        : <OrderItemModel>[];

    return OrderModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      userId: json['user_id'] is int ? json['user_id'] : int.tryParse(json['user_id']?.toString() ?? '0') ?? 0,
      productId: json['product_id'] is int ? json['product_id'] : int.tryParse(json['product_id']?.toString() ?? ''),
      productName: json['product_name'] as String?,
      quantity: json['quantity'] is int ? json['quantity'] : int.tryParse(json['quantity']?.toString() ?? '1') ?? 1,
      totalAmount: (json['total_amount'] is num)
          ? (json['total_amount'] as num).toDouble()
          : double.tryParse(json['total_amount']?.toString() ?? '0.0') ?? 0.0,
      status: json['status'] as String? ?? 'pending',
      idempotencyKey: json['idempotency_key'] as String?,
      createdAt: json['created_at'] as String?,
      expiresAt: json['expires_at'] as String?,
      items: itemsList,
    );
  }

  @override
  List<Object?> get props => [
        id,
        userId,
        productId,
        productName,
        quantity,
        totalAmount,
        status,
        idempotencyKey,
        createdAt,
        expiresAt,
        items,
      ];
}

class ReservationResponse extends Equatable {
  final String message;
  final OrderModel order;
  final String? taskId;

  const ReservationResponse({
    required this.message,
    required this.order,
    this.taskId,
  });

  factory ReservationResponse.fromJson(Map<String, dynamic> json) {
    return ReservationResponse(
      message: json['message'] as String? ?? 'Reservation accepted',
      order: OrderModel.fromJson(json['order'] as Map<String, dynamic>),
      taskId: json['task_id'] as String?,
    );
  }

  @override
  List<Object?> get props => [message, order, taskId];
}
