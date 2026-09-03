import 'package:equatable/equatable.dart';

class OrderItemModel extends Equatable {
  final dynamic id;
  final dynamic productId;
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
      id: json['id'] != null ? (json['id'] is int ? json['id'] : json['id'].toString()) : null,
      productId: json['product_id'] != null
          ? (json['product_id'] is int ? json['product_id'] : json['product_id'].toString())
          : 0,
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
  final dynamic id;
  final dynamic userId;
  final dynamic productId;
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

  String get shortId {
    final str = id.toString().replaceAll('-', '');
    if (str.isEmpty || str == '0') return '0';
    return str.length > 8 ? str.substring(0, 8).toUpperCase() : str.toUpperCase();
  }

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
      id: json['id'] != null ? (json['id'] is int ? json['id'] : json['id'].toString()) : '0',
      userId: json['user_id'] != null ? (json['user_id'] is int ? json['user_id'] : json['user_id'].toString()) : '0',
      productId: json['product_id'] != null ? (json['product_id'] is int ? json['product_id'] : json['product_id'].toString()) : null,
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
