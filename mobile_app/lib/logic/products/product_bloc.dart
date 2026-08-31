import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mobile_app/data/models/category_model.dart';
import 'package:mobile_app/data/models/product_model.dart';
import 'package:mobile_app/data/repositories/product_repository.dart';
import 'package:mobile_app/logic/products/product_event.dart';
import 'package:mobile_app/logic/products/product_state.dart';

class ProductBloc extends Bloc<ProductEvent, ProductState> {
  final ProductRepository _productRepository;

  ProductBloc({required ProductRepository productRepository})
      : _productRepository = productRepository,
        super(ProductInitial()) {
    on<FetchProductsEvent>(_onFetchProducts);
    on<SelectCategoryEvent>(_onSelectCategory);
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
        _productRepository.getPaginatedProducts(
          categoryId: event.categoryId,
          search: event.search,
          page: 1,
        ),
        _productRepository.getProducts(isFlashSale: true),
        _productRepository.getCategories(),
      ];

      final results = await Future.wait(futures);
      final paginated = results[0] as PaginatedProducts;

      emit(ProductLoaded(
        products: paginated.items,
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

  Future<void> _onSelectCategory(SelectCategoryEvent event, Emitter<ProductState> emit) async {
    final currentState = state;
    if (currentState is ProductLoaded) {
      try {
        final paginated = await _productRepository.getPaginatedProducts(
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
        final paginated = await _productRepository.getPaginatedProducts(
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
        final paginated = await _productRepository.getPaginatedProducts(
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
        final paginated = await _productRepository.getPaginatedProducts(
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
