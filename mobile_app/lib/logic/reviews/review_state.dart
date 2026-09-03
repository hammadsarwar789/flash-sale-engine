import 'package:equatable/equatable.dart';
import 'package:mobile_app/data/models/product_model.dart';

abstract class ReviewState extends Equatable {
  const ReviewState();
  @override
  List<Object?> get props => [];
}

class ReviewInitial extends ReviewState {}

class ReviewSubmitting extends ReviewState {}

class ReviewSubmissionSuccess extends ReviewState {
  final ReviewModel review;
  const ReviewSubmissionSuccess(this.review);

  @override
  List<Object?> get props => [review];
}

class ReviewSubmissionFailure extends ReviewState {
  final String message;
  const ReviewSubmissionFailure(this.message);

  @override
  List<Object?> get props => [message];
}
