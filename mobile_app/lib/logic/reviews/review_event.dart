import 'package:equatable/equatable.dart';

abstract class ReviewEvent extends Equatable {
  const ReviewEvent();
  @override
  List<Object?> get props => [];
}

class SubmitReviewEvent extends ReviewEvent {
  final dynamic productId;
  final int rating;
  final String? title;
  final String? comment;

  const SubmitReviewEvent({
    required this.productId,
    required this.rating,
    this.title,
    this.comment,
  });

  @override
  List<Object?> get props => [productId, rating, title, comment];
}
