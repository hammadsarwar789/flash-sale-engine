import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProducts, useCategories } from '../hooks/useCatalog';
import { ProductCard } from '../components/product/ProductCard';
import { Eyebrow } from '../components/ui/Eyebrow';

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
  const { data: productsData, isLoading, isError, error } = useProducts({
    search: search.trim() || undefined,
    category_id: categoryId || undefined,
    sort_by: sortBy,
    page,
    per_page: 12,
  });

  const products = productsData?.items || [];
  const totalItems = productsData?.total || 0;
  const totalPages = productsData?.pages || 1;

  return (
    <div className="space-y-8">
      {/* Editorial Header Section */}
      <div className="border-b border-rule pb-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs font-mono text-ash border-b border-rule/50 pb-3">
          <span>ISSUE Nº 042 — WEEK OF JUL 27</span>
          <span className="mt-1 sm:mt-0">ALL PRICES IN USD</span>
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-[48px] sm:text-[88px] leading-[0.95] text-ink font-normal tracking-tight">
            The Flash<br />Sale Floor.
          </h1>
          <div className="font-mono text-xs text-ash pt-2">
            <span>{totalItems.toLocaleString()} items</span>
            <span className="mx-2">·</span>
            <span>{products.length} on this page</span>
            <span className="mx-2">·</span>
            <span>page {page} of {totalPages}</span>
          </div>
        </div>
      </div>

      {/* Filter & Sort Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-rule pb-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <Eyebrow className="text-ash mr-2">CATEGORY</Eyebrow>
          <button
            onClick={() => {
              setCategoryId('');
              updateFilters({ category_id: '', page: '1' });
            }}
            className={`px-3 py-1 text-xs font-mono border transition-colors rounded-none ${
              !categoryId ? 'bg-ink text-paper border-ink font-semibold' : 'bg-paper text-ink border-rule hover:bg-paper-sunk'
            }`}
          >
            ● ALL
          </button>

          {categories.map((c) => {
            const isSelected = categoryId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setCategoryId(c.id);
                  updateFilters({ category_id: c.id, page: '1' });
                }}
                className={`px-3 py-1 text-xs font-mono border transition-colors rounded-none ${
                  isSelected ? 'bg-ink text-paper border-ink font-semibold' : 'bg-paper text-ink border-rule hover:bg-paper-sunk'
                }`}
              >
                {c.name.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* Sort Select Dropdown */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <Eyebrow className="text-ash">SORT</Eyebrow>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              updateFilters({ sort_by: e.target.value });
            }}
            className="bg-paper-sunk border border-rule text-ink text-xs font-mono px-3 py-1 rounded-none focus:outline-none focus:border-ink"
          >
            <option value="created_at">▾ NEWEST</option>
            <option value="price_asc">▾ PRICE: LOW TO HIGH</option>
            <option value="price_desc">▾ PRICE: HIGH TO LOW</option>
          </select>
        </div>
      </div>

      {/* Product Catalog Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-96 border border-rule bg-paper-sunk p-4 space-y-4 rounded-none">
              <div className="bg-paper border border-rule h-52"></div>
              <div className="h-4 bg-ash/30 w-3/4"></div>
              <div className="h-4 bg-ash/30 w-1/2"></div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 border border-loss bg-paper text-center space-y-2 rounded-none">
          <p className="text-loss font-mono text-sm font-semibold">FAILED TO LOAD CATALOG FLOOR</p>
          <p className="text-ash text-xs font-mono">{(error as any)?.message || 'Verify Flask backend server is running on localhost:5000'}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center space-y-3 border border-rule bg-paper rounded-none">
          <h3 className="font-serif text-2xl text-ink">No items on floor</h3>
          <p className="text-ash text-xs font-mono">Try adjusting search parameters or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              issueNumber={`Nº ${String((page - 1) * 12 + idx + 1).padStart(3, '0')}`}
            />
          ))}
        </div>
      )}

      {/* Monospace Pagination */}
      {!isLoading && products.length > 0 && (
        <div className="flex items-center justify-center pt-8 border-t border-rule font-mono text-xs">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => updateFilters({ page: Math.max(1, page - 1).toString() })}
              disabled={page <= 1}
              className="hover:text-signal disabled:text-ash disabled:no-underline underline"
            >
              ← PREVIOUS
            </button>
            <span className="text-ink">
              {String((page - 1) * 12 + 1).padStart(3, '0')}–{String((page - 1) * 12 + products.length).padStart(3, '0')} OF {totalItems.toLocaleString()}
            </span>
            <button
              onClick={() => updateFilters({ page: (page + 1).toString() })}
              disabled={page >= totalPages}
              className="hover:text-signal disabled:text-ash disabled:no-underline underline"
            >
              NEXT →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
