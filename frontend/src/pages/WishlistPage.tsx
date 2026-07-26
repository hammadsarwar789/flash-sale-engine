import React from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist';
import { useCart } from '../hooks/useCart';
import { Heart, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

export const WishlistPage: React.FC = () => {
  const { wishlistItems, isLoading, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-12 space-y-4 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-slate-900 rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4 glass-card rounded-3xl p-8 border border-slate-800">
        <Heart className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">Your Wishlist is Empty</h2>
        <p className="text-slate-400 text-sm">Save your favorite flash sale products here to buy later.</p>
        <Link to="/products" className="inline-flex items-center space-x-2 bg-cyan-500 font-bold px-6 py-2.5 rounded-xl text-slate-950">
          <span>Browse Products</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2">
          <Heart className="w-8 h-8 text-rose-500 fill-rose-500" />
          <span>My Saved Wishlist ({wishlistItems.length})</span>
        </h1>
        <p className="text-slate-400 text-sm">Quickly transfer items to your cart when ready to checkout.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {wishlistItems.map((item) => {
          const product = item.product;
          if (!product) {
            return (
              <div key={item.id} className="p-4 rounded-2xl glass-card border border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-400">Product #{item.product_id}</span>
                <button onClick={() => removeFromWishlist(item.id)} className="text-rose-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          }

          const img = product.images && product.images.length > 0
            ? product.images[0]
            : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';

          return (
            <div key={item.id} className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-col justify-between space-y-4">
              <Link to={`/products/${product.id}`} className="block space-y-3">
                <img
                  src={img}
                  alt={product.name}
                  className="w-full aspect-square object-cover rounded-xl bg-slate-900"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
                  }}
                />
                <div>
                  <h3 className="font-bold text-sm text-white line-clamp-1">{product.name}</h3>
                  <span className="text-base font-extrabold text-cyan-400 block">${Number(product.price).toFixed(2)}</span>
                </div>
              </Link>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={() => addToCart({ product_id: product.id, quantity: 1 })}
                  className="flex items-center space-x-1 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-3 py-1.5 rounded-lg"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Add to Cart</span>
                </button>

                <button
                  onClick={() => removeFromWishlist(item.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900"
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
