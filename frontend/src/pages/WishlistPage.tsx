import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist';
import { useCart } from '../hooks/useCart';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Money } from '../components/ui/Money';
import { Heart, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

export const WishlistPage: React.FC = () => {
  const { wishlistItems, isLoading, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const handleMoveToCart = async (productId: string, wishlistItemId: string) => {
    try {
      await addToCart({ product_id: productId, quantity: 1 });
      await removeFromWishlist(wishlistItemId);
    } catch (err: any) {
      console.error('Failed to move item to cart:', err);
    }
  };

  const handleMoveAllToCart = async () => {
    for (const item of wishlistItems) {
      if (item.product && (item.product.available_stock || 0) > 0) {
        try {
          await addToCart({ product_id: item.product_id, quantity: 1 });
          await removeFromWishlist(item.id);
        } catch (err) {
          // continue
        }
      }
    }
    navigate('/cart');
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-raised rounded-card"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 bg-surface border border-line rounded-card"></div>
          ))}
        </div>
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="py-20 text-center space-y-4 border border-line bg-surface rounded-card max-w-lg mx-auto p-8">
        <div className="w-12 h-12 rounded-full bg-raised flex items-center justify-center mx-auto text-amber">
          <Heart className="w-6 h-6 fill-amber text-amber" />
        </div>
        <h1 className="font-display text-3xl font-bold text-text">Wishlist is empty</h1>
        <p className="font-mono text-xs text-text-mute">No saved commodity items on your personal wishlist.</p>
        <Link
          to="/products"
          className="inline-block bg-amber text-on-amber font-sans font-semibold text-xs uppercase px-6 py-3 rounded-card hover:bg-amber-press transition-colors"
        >
          ← Explore The Floor
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-line pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Eyebrow className="text-amber block font-bold">SAVED COMMODITIES</Eyebrow>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-text tracking-tight">Wishlist</h1>
          <p className="font-mono text-xs text-text-mute mt-1">
            {wishlistItems.length} saved product items reserved for quick checkout allocation.
          </p>
        </div>

        <button
          onClick={handleMoveAllToCart}
          className="bg-amber text-on-amber font-sans font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-card hover:bg-amber-press transition-colors flex items-center gap-2"
        >
          <span>MOVE ALL IN-STOCK TO CART</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid of Wishlist Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {wishlistItems.map((item) => {
          const product = item.product;
          if (!product) {
            return (
              <div key={item.id} className="p-4 border border-line bg-surface rounded-card font-mono text-xs flex justify-between items-center">
                <span className="text-text-mute">Product #{item.product_id}</span>
                <button onClick={() => removeFromWishlist(item.id)} className="text-rose hover:underline">
                  REMOVE
                </button>
              </div>
            );
          }

          const img = product.images && product.images.length > 0
            ? product.images[0]
            : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';

          const inStock = (product.available_stock || 0) > 0;

          return (
            <div key={item.id} className="p-4 border border-line bg-surface rounded-card flex flex-col justify-between space-y-4 hover:border-line-strong transition-colors">
              <Link to={`/products/${product.id}`} className="block space-y-3">
                <div className="relative aspect-square w-full bg-raised border border-line rounded-card overflow-hidden">
                  <img
                    src={img}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <div className="absolute top-2 right-2 bg-surface/80 p-1.5 rounded-full text-amber">
                    <Heart className="w-4 h-4 fill-amber text-amber" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-sans font-semibold text-base text-text line-clamp-1">{product.name}</h3>
                  <Eyebrow className="text-text-mute block">
                    {typeof product.category === 'string' ? product.category : product.category?.name || 'CATALOG'}
                  </Eyebrow>
                  <Money amount={Number(product.price)} size="inline" className="font-bold text-text block pt-1" />
                </div>
              </Link>

              <div className="space-y-2 pt-3 border-t border-line font-mono text-xs">
                <button
                  onClick={() => handleMoveToCart(product.id, item.id)}
                  disabled={!inStock}
                  className="w-full py-2 bg-raised hover:bg-overlay border border-line text-text hover:text-amber font-sans font-bold text-xs uppercase tracking-wider rounded-card transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{inStock ? 'MOVE TO CART' : 'OUT OF STOCK'}</span>
                </button>

                <div className="flex items-center justify-between pt-1">
                  <Link
                    to={`/products/${product.id}`}
                    className="text-text-mute hover:text-text underline text-[11px]"
                  >
                    VIEW SPEC
                  </Link>

                  <button
                    onClick={() => removeFromWishlist(item.id)}
                    className="text-text-mute hover:text-rose text-[11px] flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>REMOVE</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
