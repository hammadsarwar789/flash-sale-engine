import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useProductDetail,
  useProductVariants,
  useProductReviews,
} from '../hooks/useCatalog';
import { VariantPicker } from '../components/product/VariantPicker';
import { ReviewList } from '../components/product/ReviewList';
import { ReviewForm } from '../components/product/ReviewForm';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingBag,
  Heart,
  Star,
  Flame,
  ShieldCheck,
  Truck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { ProductVariant } from '../types/api';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const { data: product, isLoading, isError, error } = useProductDetail(id);
  const { data: variants = [] } = useProductVariants(id);
  const { data: reviews = [], refetch: refetchReviews } = useProductReviews(id);

  const { addToCart, isAddingToCart } = useCart();
  const { wishlistItems, addToWishlist, removeFromWishlist } = useWishlist();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'reviews' | 'specs'>('reviews');
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  const isWishlisted = wishlistItems.some((item) => item.product_id === id);
  const wishlistItem = wishlistItems.find((item) => item.product_id === id);

  const activePrice = selectedVariant?.price ?? product?.price ?? 0;
  const activeStock = selectedVariant?.available_stock ?? product?.available_stock ?? product?.total_stock ?? 0;
  const isOut = activeStock <= 0;

  const images = product?.images && product.images.length > 0
    ? product.images
    : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'];

  const mainImage = selectedImage || images[0];

  const handleAddToCart = async (buyNow = false) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!product) return;

    try {
      await addToCart({
        product_id: product.id,
        variant_id: selectedVariant?.id,
        quantity,
      });
      setNoticeMsg('Item successfully added to cart!');
      setTimeout(() => setNoticeMsg(null), 3000);
      if (buyNow) {
        navigate('/cart');
      }
    } catch (err: any) {
      setNoticeMsg(err.message || 'Failed to add to cart');
    }
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!id) return;

    if (isWishlisted && wishlistItem) {
      await removeFromWishlist(wishlistItem.id);
    } else {
      await addToWishlist(id);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-12 space-y-8 animate-pulse">
        <div className="h-6 w-32 bg-slate-800 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="h-96 bg-slate-900 rounded-3xl"></div>
          <div className="space-y-4">
            <div className="h-8 bg-slate-800 rounded w-3/4"></div>
            <div className="h-6 bg-slate-800 rounded w-1/4"></div>
            <div className="h-24 bg-slate-900 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4 glass-card rounded-3xl p-8 border border-rose-500/30">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Product Not Found</h2>
        <p className="text-slate-400 text-sm">{(error as any)?.message || 'The requested item could not be retrieved.'}</p>
        <Link to="/products" className="inline-block bg-slate-800 text-cyan-400 font-bold px-6 py-2.5 rounded-xl">
          Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      
      {/* Navigation Breadcrumb */}
      <Link to="/products" className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-400 hover:text-cyan-400 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Catalog</span>
      </Link>

      {/* Notification banner */}
      {noticeMsg && (
        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-bold flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5" />
          <span>{noticeMsg}</span>
        </div>
      )}

      {/* Main PDP Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Left Column: Image Gallery */}
        <div className="space-y-4">
          <div className="aspect-square w-full rounded-3xl glass-panel border border-slate-800 overflow-hidden bg-slate-900">
            <img
              src={mainImage}
              alt={product.name}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
              }}
            />
          </div>

          {images.length > 1 && (
            <div className="flex items-center space-x-3 overflow-x-auto pb-2">
              {images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                    mainImage === img ? 'border-cyan-500 scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Detail & Buy Box */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
                SKU: {selectedVariant?.sku || product.sku}
              </span>
              <button
                onClick={handleWishlistToggle}
                className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300 hover:text-rose-400 transition-colors"
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
              </button>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{product.name}</h1>

            {/* Rating summary */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <span className="text-sm font-semibold text-slate-300">4.8</span>
              <span className="text-xs text-slate-500">({reviews.length} reviews)</span>
            </div>

            {/* Price Box */}
            <div className="p-4 rounded-2xl glass-card border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Flash Engine Price</span>
                <span className="text-3xl font-black text-white tracking-tight">
                  ${Number(activePrice).toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                  isOut ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                }`}>
                  {isOut ? 'Out of Stock' : `${activeStock} In Stock`}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-300 leading-relaxed">
              {product.description || 'High-performance e-commerce product backed by scalable microservice architecture and flash-sale order routing.'}
            </p>

            {/* Variant Picker */}
            {variants.length > 0 && (
              <VariantPicker
                variants={variants}
                selectedVariantId={selectedVariant?.id || null}
                onSelectVariant={(v) => setSelectedVariant(v)}
              />
            )}

            {/* Quantity Stepper */}
            <div className="flex items-center space-x-4 pt-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Quantity</label>
              <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg text-slate-300 hover:bg-slate-800 flex items-center justify-center font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-bold text-white">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg text-slate-300 hover:bg-slate-800 flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>

          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-6 border-t border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => handleAddToCart(false)}
                disabled={isOut || isAddingToCart}
                className="flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 font-bold py-3.5 rounded-2xl transition-all disabled:opacity-50"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>{isAddingToCart ? 'Adding...' : 'Add to Cart'}</span>
              </button>

              <button
                onClick={() => handleAddToCart(true)}
                disabled={isOut || isAddingToCart}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black py-3.5 rounded-2xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Flame className="w-5 h-5 fill-slate-950" />
                <span>Instant Checkout</span>
              </button>
            </div>

            <div className="flex items-center justify-around pt-3 text-slate-400 text-xs font-medium">
              <span className="flex items-center space-x-1"><Truck className="w-4 h-4 text-cyan-400" /> Fast Delivery</span>
              <span className="flex items-center space-x-1"><ShieldCheck className="w-4 h-4 text-cyan-400" /> 30-Day Guarantee</span>
            </div>
          </div>

        </div>
      </div>

      {/* Tabs: Reviews & Specifications */}
      <div className="pt-10 border-t border-slate-800 space-y-6">
        <div className="flex items-center space-x-6 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 font-bold text-sm transition-colors border-b-2 ${
              activeTab === 'reviews'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Customer Reviews ({reviews.length})
          </button>
        </div>

        {activeTab === 'reviews' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ReviewList reviews={reviews} />
            </div>
            <div>
              <ReviewForm productId={product.id} onReviewSubmitted={refetchReviews} />
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
