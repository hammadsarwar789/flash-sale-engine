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
  }

  Future<void> _onFetchProducts(FetchProductsEvent event, Emitter<ProductState> emit) async {
    if (!event.isRefresh && state is! ProductLoaded) {
      emit(ProductLoading());
    }

    try {
      final List<Future> futures = [
        _productRepository.getProducts(
          categoryId: event.categoryId,
          search: event.search,
        ),
        _productRepository.getProducts(isFlashSale: true),
        _productRepository.getCategories(),
      ];

      final results = await Future.wait(futures);

      emit(ProductLoaded(
        products: results[0] as List<ProductModel>,
        flashSaleProducts: results[1] as List<ProductModel>,
        categories: results[2] as List<CategoryModel>,
        selectedCategoryId: event.categoryId,
        searchQuery: event.search ?? '',
      ));
    } catch (e) {
      emit(ProductError(e.toString()));
    }
  }

  Future<void> _onSelectCategory(SelectCategoryEvent event, Emitter<ProductState> emit) async {
    final currentState = state;
    if (currentState is ProductLoaded) {
      try {
        final products = await _productRepository.getProducts(
          categoryId: event.categoryId,
          search: currentState.searchQuery.isNotEmpty ? currentState.searchQuery : null,
        );
        emit(currentState.copyWith(
          products: products,
          selectedCategoryId: event.categoryId,
          clearCategory: event.categoryId == null,
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
        final products = await _productRepository.getProducts(
          categoryId: currentState.selectedCategoryId,
          search: event.query,
        );
        emit(currentState.copyWith(
          products: products,
          searchQuery: event.query,
        ));
      } catch (e) {
        emit(ProductError(e.toString()));
      }
    }
  }
}
