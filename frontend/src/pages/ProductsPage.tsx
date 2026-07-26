import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProducts, useCategories } from '../hooks/useCatalog';
import { ProductCard } from '../components/product/ProductCard';
import { Search, SlidersHorizontal, ArrowUpDown, Flame, PackageX } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category_id') || '';
  const initialSort = searchParams.get('sort_by') || 'created_at';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  const [search, setSearch] = useState(initialSearch);
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [sortBy, setSortBy] = useState(initialSort);
  const [page, setPage] = useState(initialPage);

  // Sync state with URL params when URL changes
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setCategoryId(searchParams.get('category_id') || '');
    setSortBy(searchParams.get('sort_by') || 'created_at');
    setPage(parseInt(searchParams.get('page') || '1', 10));
  }, [searchParams]);

  const updateFilters = (newParams: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val) {
        next.set(key, val);
      } else {
        next.delete(key);
      }
    });
    setSearchParams(next);
  };

  const { data: categories = [] } = useCategories();
  const { data: products = [], isLoading, isError, error } = useProducts({
    search: search.trim() || undefined,
    category_id: categoryId || undefined,
    sort_by: sortBy,
    page,
    per_page: 12,
  });

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="relative rounded-3xl overflow-hidden glass-panel p-8 sm:p-12 border border-cyan-500/20 shadow-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            <Flame className="w-4 h-4 animate-pulse" />
            <span>High-Speed Flash Sale Engine</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Discover Exclusive Deals & Premium Products
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Real-time inventory pool synchronized via Redis Lua scripts. Lock in your orders with instant stock reservation!
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4 rounded-2xl glass-card border border-slate-800">
        
        {/* Search Bar */}
        <div className="relative w-full lg:w-96">
          <input
            type="text"
            placeholder="Search products, SKUs..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              updateFilters({ search: e.target.value, page: '1' });
            }}
            className="w-full bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        </div>

        {/* Category Pills & Sort Select */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          
          {/* Categories dropdown / filter */}
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                updateFilters({ category_id: e.target.value, page: '1' });
              }}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort selector */}
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="w-4 h-4 text-cyan-400" />
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                updateFilters({ sort_by: e.target.value });
              }}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500"
            >
              <option value="created_at">Newest Arrivals</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Catalog Grid State */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-80 rounded-2xl glass-card animate-pulse p-4 space-y-4">
              <div className="bg-slate-900 h-44 rounded-xl"></div>
              <div className="h-4 bg-slate-800 rounded w-3/4"></div>
              <div className="h-4 bg-slate-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2">
          <p className="text-rose-400 font-bold text-base">Failed to load catalog products</p>
          <p className="text-slate-400 text-xs">{(error as any)?.message || 'Make sure backend API is running on localhost:5000'}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center space-y-3 rounded-3xl glass-card border border-slate-800">
          <PackageX className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-200">No products found</h3>
          <p className="text-slate-400 text-sm">Try tweaking your search term or category filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!isLoading && products.length > 0 && (
        <div className="flex items-center justify-between pt-6 border-t border-slate-800">
          <button
            onClick={() => updateFilters({ page: Math.max(1, page - 1).toString() })}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-300 hover:text-white disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs font-semibold text-slate-400">Page {page}</span>
          <button
            onClick={() => updateFilters({ page: (page + 1).toString() })}
            disabled={products.length < 12}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-300 hover:text-white disabled:opacity-40"
          >
            Next Page
          </button>
        </div>
      )}
    </div>
  );
};
