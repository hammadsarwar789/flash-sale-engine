import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile_app/data/models/category_model.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/data/repositories/product_repository.dart';
import 'package:mobile_app/logic/products/product_event.dart';
import 'package:mobile_app/logic/products/product_state.dart';

class ProductBloc extends Bloc<ProductEvent, ProductState> {
  final ProductRepository productRepository;

  ProductBloc({required this.productRepository})
      : super(ProductInitial()) {
    on<FetchProductsEvent>(_onFetchProducts);
    on<SelectCategoryEvent>(_onSelectCategory);
    on<FilterByCategoryEvent>(_onFilterByCategory);
    on<SearchQueryChangedEvent>(_onSearchQueryChanged);
    on<SortChangedEvent>(_onSortChanged);
    on<PageChangedEvent>(_onPageChanged);
  }

  Future<void> _onFetchProducts(FetchProductsEvent event, Emitter<ProductState> emit) async {
    if (!event.isRefresh && state is! ProductLoaded) {
      emit(ProductLoading());
    }

    try {
      final List<Future> futures = [
        productRepository.getPaginatedProducts(
          categoryId: event.categoryId,
          search: event.search,
          page: 1,
        ),
        productRepository.getProducts(isFlashSale: true),
        productRepository.getCategories(),
      ];

      final results = await Future.wait(futures);
      final paginated = results[0] as PaginatedProducts;
      final all = paginated.items;

      emit(ProductLoaded(
        allProducts: all,
        filteredProducts: all,
        selectedCategory: 'ALL POOLS',
        flashSaleProducts: results[1] as List<ProductModel>,
        categories: results[2] as List<CategoryModel>,
        selectedCategoryId: event.categoryId,
        searchQuery: event.search ?? '',
        currentPage: paginated.page,
        totalPages: paginated.pages,
        totalItems: paginated.total,
        sortBy: 'created_at',
      ));
    } catch (e) {
      emit(ProductError(e.toString()));
    }
  }

  void _onFilterByCategory(FilterByCategoryEvent event, Emitter<ProductState> emit) {
    final currentState = state;
    if (currentState is ProductLoaded) {
      final category = event.category.trim();
      List<ProductModel> filtered;
      if (category.toUpperCase() == 'ALL POOLS' || category.isEmpty) {
        filtered = List.from(currentState.allProducts);
      } else {
        filtered = currentState.allProducts.where((p) {
          final cat = (p.categoryName ?? p.category).trim().toLowerCase();
          return cat == category.toLowerCase();
        }).toList();
      }
      emit(currentState.copyWith(
        selectedCategory: category,
        filteredProducts: filtered,
      ));
    }
  }

  Future<void> _onSelectCategory(SelectCategoryEvent event, Emitter<ProductState> emit) async {
    final currentState = state;
    if (currentState is ProductLoaded) {
      try {
        final paginated = await productRepository.getPaginatedProducts(
          categoryId: event.categoryId,
          search: currentState.searchQuery.isNotEmpty ? currentState.searchQuery : null,
          sortBy: currentState.sortBy,
          page: 1,
        );
        emit(currentState.copyWith(
          products: paginated.items,
          selectedCategoryId: event.categoryId,
          clearCategory: event.categoryId == null,
          currentPage: paginated.page,
          totalPages: paginated.pages,
          totalItems: paginated.total,
        ));
      } catch (e) {
        emit(ProductError(e.toString()));
      }
    }
  }

  Future<void> _onSearchQueryChanged(SearchQueryChangedEvent event, Emitter<ProductState> emit) async {
    final currentState = state;
    if (currentState is ProductLoaded) {
      try {
        final paginated = await productRepository.getPaginatedProducts(
          categoryId: currentState.selectedCategoryId,
          search: event.query,
          sortBy: currentState.sortBy,
          page: 1,
        );
        emit(currentState.copyWith(
          products: paginated.items,
          searchQuery: event.query,
          currentPage: paginated.page,
          totalPages: paginated.pages,
          totalItems: paginated.total,
        ));
      } catch (e) {
        emit(ProductError(e.toString()));
      }
    }
  }

  Future<void> _onSortChanged(SortChangedEvent event, Emitter<ProductState> emit) async {
    final currentState = state;
    if (currentState is ProductLoaded) {
      try {
        final paginated = await productRepository.getPaginatedProducts(
          categoryId: currentState.selectedCategoryId,
          search: currentState.searchQuery.isNotEmpty ? currentState.searchQuery : null,
          sortBy: event.sortBy,
          page: 1,
        );
        emit(currentState.copyWith(
          products: paginated.items,
          sortBy: event.sortBy,
          currentPage: paginated.page,
          totalPages: paginated.pages,
          totalItems: paginated.total,
        ));
      } catch (e) {
        emit(ProductError(e.toString()));
      }
    }
  }

  Future<void> _onPageChanged(PageChangedEvent event, Emitter<ProductState> emit) async {
    final currentState = state;
    if (currentState is ProductLoaded) {
      try {
        final paginated = await productRepository.getPaginatedProducts(
          categoryId: currentState.selectedCategoryId,
          search: currentState.searchQuery.isNotEmpty ? currentState.searchQuery : null,
          sortBy: currentState.sortBy,
          page: event.page,
        );
        emit(currentState.copyWith(
          products: paginated.items,
          currentPage: paginated.page,
          totalPages: paginated.pages,
          totalItems: paginated.total,
        ));
      } catch (e) {
        emit(ProductError(e.toString()));
      }
    }
  }
}
