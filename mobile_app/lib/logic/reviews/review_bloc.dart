import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile_app/data/repositories/product_repository.dart';
import 'package:mobile_app/logic/reviews/review_event.dart';
import 'package:mobile_app/logic/reviews/review_state.dart';

class ReviewBloc extends Bloc<ReviewEvent, ReviewState> {
  final ProductRepository productRepository;

  ReviewBloc({required this.productRepository}) : super(ReviewInitial()) {
    on<SubmitReviewEvent>(_onSubmitReview);
  }

  Future<void> _onSubmitReview(SubmitReviewEvent event, Emitter<ReviewState> emit) async {
    emit(ReviewSubmitting());
    try {
      final review = await productRepository.submitProductReview(
        event.productId,
        rating: event.rating,
        title: event.title,
        comment: event.comment,
      );
      emit(ReviewSubmissionSuccess(review));
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        emit(const ReviewSubmissionFailure('Please sign in to share your product review.'));
      } else {
        final errorMsg = e.response?.data is Map && e.response?.data['detail'] != null
            ? e.response!.data['detail'].toString()
            : (e.message ?? 'Failed to submit review');
        emit(ReviewSubmissionFailure(errorMsg));
      }
    } catch (e) {
      emit(ReviewSubmissionFailure(e.toString()));
    }
  }
}
