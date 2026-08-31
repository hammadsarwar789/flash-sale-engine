import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProducts, useCategories } from '../hooks/useCatalog';
import { ProductCard } from '../components/product/ProductCard';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: search.trim(), page: '1' });
  };

  return (
    <div className="space-y-8">
      {/* Floor Hero Section */}
      <div className="border-b border-line pb-8 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs font-mono text-text-mute border-b border-line/50 pb-3">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber animate-signal-pulse" />
            THE COMMODITY FLOOR · REAL-TIME INVENTORY
          </span>
          <span className="mt-1 sm:mt-0">CURRENCY: USD</span>
        </div>

        <div className="space-y-2">
          <Eyebrow className="text-amber tracking-widest font-bold">THE FLOOR</Eyebrow>
          <h1 className="font-display text-4xl sm:text-6xl font-bold text-text tracking-tight leading-tight">
            Everything, moving fast.
          </h1>
          <div className="font-mono text-xs text-text-mute pt-1 flex flex-wrap items-center gap-2">
            <span className="text-text font-semibold">{totalItems.toLocaleString()} items total</span>
            <span>·</span>
            <span>{products.length} listed on this page</span>
            <span>·</span>
            <span>page {page} of {totalPages}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Controls Bar */}
      <div className="space-y-4 border-b border-line pb-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Search Field */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-text-mute absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name or SKU..."
              className="w-full bg-raised border border-line rounded-card pl-10 pr-4 py-2.5 text-xs font-mono text-text placeholder:text-text-mute focus:border-line-strong focus:outline-none transition-colors"
            />
          </form>

          {/* Sort Selector */}
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono text-text-mute uppercase">SORT BY:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                updateFilters({ sort_by: e.target.value, page: '1' });
              }}
              className="bg-raised border border-line rounded-card px-3 py-2 text-xs font-mono text-text focus:border-line-strong focus:outline-none cursor-pointer"
            >
              <option value="created_at">Latest Drops (Newest)</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="stock_desc">Available Stock: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Pills Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Eyebrow className="text-text-mute mr-1">CATEGORY:</Eyebrow>
          <button
            onClick={() => {
              setCategoryId('');
              updateFilters({ category_id: '', page: '1' });
            }}
            className={`px-3 py-1 text-xs font-mono rounded-pill transition-colors ${
              !categoryId
                ? 'bg-amber text-on-amber font-bold'
                : 'bg-raised text-text-dim border border-line hover:border-line-strong'
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
                className={`px-3 py-1 text-xs font-mono rounded-pill transition-colors capitalize ${
                  isSelected
                    ? 'bg-amber text-on-amber font-bold'
                    : 'bg-raised text-text-dim border border-line hover:border-line-strong'
                }`}
              >
                {c.name}
              </button>
            );
          })}

          {(search || categoryId) && (
            <button
              onClick={() => {
                setSearch('');
                setCategoryId('');
                updateFilters({ search: '', category_id: '', page: '1' });
              }}
              className="px-2.5 py-1 text-[11px] font-mono text-rose hover:text-rose-soft transition-colors ml-auto"
            >
              CLEAR FILTERS ✕
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-surface border border-line rounded-card p-4 space-y-4 animate-pulse">
              <div className="h-4 bg-raised rounded w-24"></div>
              <div className="aspect-square bg-raised rounded-card w-full"></div>
              <div className="h-4 bg-raised rounded w-3/4"></div>
              <div className="h-4 bg-raised rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error View */}
      {isError && (
        <div className="bg-raised border border-rose/40 rounded-card p-8 text-center space-y-3 font-mono">
          <div className="text-rose text-sm font-semibold">COULD NOT CONNECT TO COMMODITY FEED</div>
          <div className="text-text-mute text-xs">{(error as any)?.message || 'An unexpected error occurred.'}</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-amber text-on-amber font-sans font-semibold text-xs px-4 py-2 rounded-card hover:bg-amber-press transition-colors mt-2"
          >
            RETRY CONNECTION
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && products.length === 0 && (
        <div className="bg-surface border border-line rounded-card p-16 text-center space-y-4 font-mono">
          <div className="text-text-mute text-xs tracking-widest uppercase">NO INVENTORY MATCHES FOUND</div>
          <p className="text-sm text-text-dim max-w-md mx-auto">
            No items matched your current filter criteria on the floor. Try clearing search keywords or selecting all categories.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setCategoryId('');
              updateFilters({ search: '', category_id: '', page: '1' });
            }}
            className="bg-amber text-on-amber font-sans font-semibold text-xs px-5 py-2.5 rounded-card hover:bg-amber-press transition-colors"
          >
            BROWSE ALL INVENTORY
          </button>
        </div>
      )}

      {/* Product Grid (4 columns desktop, 3 tablet, 2 mobile) */}
      {!isLoading && !isError && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              issueNumber={`#${String(idx + 1 + (page - 1) * 12).padStart(3, '0')}`}
            />
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-line pt-6 font-mono text-xs text-text-dim">
          <button
            disabled={page <= 1}
            onClick={() => updateFilters({ page: String(page - 1) })}
            className="flex items-center gap-1 px-4 py-2 bg-raised border border-line rounded-card disabled:opacity-40 disabled:cursor-not-allowed hover:border-line-strong transition-colors text-text"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>PREVIOUS</span>
          </button>

          <span className="text-text-mute">
            PAGE <span className="text-text font-semibold">{page}</span> OF <span className="text-text font-semibold">{totalPages}</span>
          </span>

          <button
            disabled={page >= totalPages}
            onClick={() => updateFilters({ page: String(page + 1) })}
            className="flex items-center gap-1 px-4 py-2 bg-raised border border-line rounded-card disabled:opacity-40 disabled:cursor-not-allowed hover:border-line-strong transition-colors text-text"
          >
            <span>NEXT</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
