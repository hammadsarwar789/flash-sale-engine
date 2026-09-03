import 'package:equatable/equatable.dart';

abstract class ProductEvent extends Equatable {
  const ProductEvent();
  @override
  List<Object?> get props => [];
}

class FetchProductsEvent extends ProductEvent {
  final dynamic categoryId;
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
  final dynamic categoryId;
  const SelectCategoryEvent(this.categoryId);

  @override
  List<Object?> get props => [categoryId];
}

class FilterByCategoryEvent extends ProductEvent {
  final String category;
  const FilterByCategoryEvent({required this.category});

  @override
  List<Object?> get props => [category];
}

class SearchQueryChangedEvent extends ProductEvent {
  final String query;
  const SearchQueryChangedEvent(this.query);

  @override
  List<Object?> get props => [query];
}

class SortChangedEvent extends ProductEvent {
  final String sortBy;
  const SortChangedEvent(this.sortBy);

  @override
  List<Object?> get props => [sortBy];
}

class PageChangedEvent extends ProductEvent {
  final int page;
  const PageChangedEvent(this.page);

  @override
  List<Object?> get props => [page];
}
