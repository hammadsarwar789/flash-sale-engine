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
  final List<ProductModel> allProducts;
  final List<ProductModel> filteredProducts;
  final String selectedCategory;
  final List<ProductModel> flashSaleProducts;
  final List<CategoryModel> categories;
  final dynamic selectedCategoryId;
  final String searchQuery;
  final String sortBy;
  final int currentPage;
  final int totalPages;
  final int totalItems;

  List<ProductModel> get products => filteredProducts;

  const ProductLoaded({
    required this.allProducts,
    required this.filteredProducts,
    this.selectedCategory = 'ALL POOLS',
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
    List<ProductModel>? allProducts,
    List<ProductModel>? filteredProducts,
    String? selectedCategory,
    List<ProductModel>? products,
    List<ProductModel>? flashSaleProducts,
    List<CategoryModel>? categories,
    dynamic selectedCategoryId,
    bool clearCategory = false,
    String? searchQuery,
    String? sortBy,
    int? currentPage,
    int? totalPages,
    int? totalItems,
  }) {
    final updatedAll = allProducts ?? (products ?? this.allProducts);
    final updatedFiltered = filteredProducts ?? (products ?? this.filteredProducts);
    return ProductLoaded(
      allProducts: updatedAll,
      filteredProducts: updatedFiltered,
      selectedCategory: selectedCategory ?? this.selectedCategory,
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
        allProducts,
        filteredProducts,
        selectedCategory,
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
