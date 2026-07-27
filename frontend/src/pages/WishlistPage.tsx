import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Numeric } from '../components/ui/Numeric';

export const WishlistPage: React.FC = () => {
  const { wishlistItems, isLoading, removeFromWishlist } = useWishlist();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-paper-sunk border border-rule"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-paper-sunk border border-rule"></div>
          ))}
        </div>
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="py-20 text-center space-y-4 border border-rule bg-paper">
        <h1 className="font-serif text-4xl text-ink">Wishlist is empty</h1>
        <p className="font-mono text-xs text-ash">No saved items on floor wishlist.</p>
        <Link to="/products" className="inline-block bg-ink text-paper font-mono text-xs uppercase px-6 py-2">
          ← Return to Floor
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-rule pb-4">
        <h1 className="font-serif text-[48px] text-ink font-normal leading-none">Wishlist.</h1>
        <p className="font-mono text-xs text-ash mt-1">Saved product SKUs reserved for future floor orders.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {wishlistItems.map((item) => {
          const product = item.product;
          if (!product) {
            return (
              <div key={item.id} className="p-4 border border-rule bg-paper font-mono text-xs flex justify-between items-center">
                <span className="text-ash">Product #{item.product_id}</span>
                <button onClick={() => removeFromWishlist(item.id)} className="text-loss underline">
                  [ REMOVE ]
                </button>
              </div>
            );
          }

          const img = product.images && product.images.length > 0
            ? product.images[0]
            : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';

          return (
            <div key={item.id} className="p-4 border border-rule bg-paper flex flex-col justify-between space-y-4">
              <Link to={`/products/${product.id}`} className="block space-y-3">
                <div className="aspect-square w-full bg-paper-sunk border border-rule overflow-hidden">
                  <img
                    src={img}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="font-sans font-medium text-base text-ink line-clamp-1">{product.name}</h3>
                  <Eyebrow className="text-ash block">{typeof product.category === 'string' ? product.category : product.category?.name || 'CATALOG'}</Eyebrow>
                  <Numeric value={Number(product.price)} format="price" zeroPadInt={3} className="text-sm font-semibold text-ink block" />
                </div>
              </Link>

              <div className="flex items-center justify-between pt-3 border-t border-rule font-mono text-xs">
                <Link
                  to={`/products/${product.id}`}
                  className="text-ink underline hover:text-signal"
                >
                  [ VIEW SPEC ]
                </Link>

                <button
                  onClick={() => removeFromWishlist(item.id)}
                  className="text-ash hover:text-loss underline"
                >
                  [ REMOVE ]
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
