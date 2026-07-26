import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Heart, Star, Flame, Zap } from 'lucide-react';
import { Product } from '../../types/api';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { useAuth } from '../../context/AuthContext';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, isAddingToCart } = useCart();
  const { wishlistItems, addToWishlist, removeFromWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const isWishlisted = wishlistItems.some((item) => item.product_id === product.id);
  const wishlistItem = wishlistItems.find((item) => item.product_id === product.id);

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (isWishlisted && wishlistItem) {
      await removeFromWishlist(wishlistItem.id);
    } else {
      await addToWishlist(product.id);
    }
  };

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    await addToCart({ product_id: product.id, quantity: 1 });
  };

  const stock = product.available_stock ?? product.total_stock ?? 0;
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 5;

  const defaultImg =
    product.images && product.images.length > 0
      ? product.images[0]
      : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';

  return (
    <div className="group relative rounded-2xl glass-card overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-cyan-500/10">
      
      {/* Product Image & Badges */}
      <Link to={`/products/${product.id}`} className="relative aspect-square w-full bg-slate-900 overflow-hidden block">
        <img
          src={defaultImg}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
          }}
        />
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10 pointer-events-none">
          {isLowStock && (
            <span className="bg-amber-500/90 backdrop-blur-md text-slate-950 font-extrabold text-[11px] px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-md">
              <Flame className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
              <span>Only {stock} Left!</span>
            </span>
          )}
          {!isLowStock && !isOutOfStock && (
            <span className="bg-emerald-500/80 backdrop-blur-md text-slate-950 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              In Stock
            </span>
          )}
          {isOutOfStock && (
            <span className="bg-rose-500/90 backdrop-blur-md text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Sold Out
            </span>
          )}

          {/* Wishlist Toggle Button */}
          <button
            onClick={handleWishlistToggle}
            className="pointer-events-auto p-2 rounded-full bg-slate-950/70 backdrop-blur-md text-slate-300 hover:text-rose-400 border border-slate-700/60 shadow-lg transition-transform active:scale-95 ml-auto"
            title={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>
      </Link>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-mono text-cyan-400/90">{product.sku}</span>
            <div className="flex items-center space-x-1 text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span className="font-semibold text-xs text-slate-200">4.8</span>
            </div>
          </div>

          <Link to={`/products/${product.id}`} className="block group-hover:text-cyan-400 transition-colors">
            <h3 className="font-bold text-base text-slate-100 line-clamp-1">{product.name}</h3>
          </Link>
          <p className="text-xs text-slate-400 line-clamp-2 mt-1 min-h-[32px]">
            {product.description || 'Premium e-commerce catalog product with high-scale backend fulfillment.'}
          </p>
        </div>

        {/* Price & Action */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Flash Price</span>
            <span className="text-lg font-extrabold text-white tracking-tight">
              ${Number(product.price).toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleQuickAdd}
            disabled={isOutOfStock || isAddingToCart}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              isOutOfStock
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 hover:shadow-cyan-500/20 hover:scale-105 active:scale-95'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{isAddingToCart ? 'Adding...' : 'Add'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
