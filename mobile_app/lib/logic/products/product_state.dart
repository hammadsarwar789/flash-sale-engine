import 'package:equatable/equatable.dart';
import 'package:mobile_app/data/models/category_model.dart';
import 'package:mobile_app/data/models/product_model.dart';

abstract class ProductState extends Equatable {
  const ProductState();
  @override
  List<Object?> get props => [];
}

class ProductInitial extends ProductState {}

class ProductLoading extends ProductState {}

class ProductLoaded extends ProductState {
  final List<ProductModel> products;
  final List<ProductModel> flashSaleProducts;
  final List<CategoryModel> categories;
  final int? selectedCategoryId;
  final String searchQuery;
  final String sortBy;
  final int currentPage;
  final int totalPages;
  final int totalItems;

  const ProductLoaded({
    required this.products,
    required this.flashSaleProducts,
    this.categories = const [],
    this.selectedCategoryId,
    this.searchQuery = '',
    this.sortBy = 'created_at',
    this.currentPage = 1,
    this.totalPages = 1,
    this.totalItems = 0,
  });

  ProductLoaded copyWith({
    List<ProductModel>? products,
    List<ProductModel>? flashSaleProducts,
    List<CategoryModel>? categories,
    int? selectedCategoryId,
    bool clearCategory = false,
    String? searchQuery,
    String? sortBy,
    int? currentPage,
    int? totalPages,
    int? totalItems,
  }) {
    return ProductLoaded(
      products: products ?? this.products,
      flashSaleProducts: flashSaleProducts ?? this.flashSaleProducts,
      categories: categories ?? this.categories,
      selectedCategoryId: clearCategory ? null : (selectedCategoryId ?? this.selectedCategoryId),
      searchQuery: searchQuery ?? this.searchQuery,
      sortBy: sortBy ?? this.sortBy,
      currentPage: currentPage ?? this.currentPage,
      totalPages: totalPages ?? this.totalPages,
      totalItems: totalItems ?? this.totalItems,
    );
  }

  @override
  List<Object?> get props => [
        products,
        flashSaleProducts,
        categories,
        selectedCategoryId,
        searchQuery,
        sortBy,
        currentPage,
        totalPages,
        totalItems,
      ];
}

class ProductError extends ProductState {
  final String message;
  const ProductError(this.message);

  @override
  List<Object?> get props => [message];
}
