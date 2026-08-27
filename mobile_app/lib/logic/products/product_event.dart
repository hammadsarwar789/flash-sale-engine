import 'package:equatable/equatable.dart';

abstract class ProductEvent extends Equatable {
  const ProductEvent();
  @override
  List<Object?> get props => [];
}

class FetchProductsEvent extends ProductEvent {
  final int? categoryId;
  final bool? isFlashSale;
  final String? search;
  final bool isRefresh;

  const FetchProductsEvent({
    this.categoryId,
    this.isFlashSale,
    this.search,
    this.isRefresh = false,
  });

  @override
  List<Object?> get props => [categoryId, isFlashSale, search, isRefresh];
}

class SelectCategoryEvent extends ProductEvent {
  final int? categoryId;
  const SelectCategoryEvent(this.categoryId);

  @override
  List<Object?> get props => [categoryId];
}

class SearchQueryChangedEvent extends ProductEvent {
  final String query;
  const SearchQueryChangedEvent(this.query);

  @override
  List<Object?> get props => [query];
}
