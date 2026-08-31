import React, { useState, useEffect } from 'react';
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
import { ProductVariant } from '../types/api';
import { Money } from '../components/ui/Money';
import { StockBar } from '../components/ui/StockBar';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Heart, ChevronLeft, Minus, Plus, ShieldCheck, Truck, RotateCcw } from 'lucide-react';

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
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  const isWishlisted = wishlistItems.some((item) => item.product_id === id);
  const wishlistItem = wishlistItems.find((item) => item.product_id === id);

  const activePrice = Number(selectedVariant?.price ?? product?.price ?? 0);
  const activeStock = selectedVariant?.available_stock ?? product?.available_stock ?? product?.total_stock ?? 0;
  const isOut = activeStock <= 0;
  const isLive = activeStock > 0 && activeStock <= 15;

  const images = product?.images && product.images.length > 0
    ? product.images
    : [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      ];

  const handleAddToCart = async () => {
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
      setNoticeMsg(`RESERVED IN CART: ${product.name} (QTY ${quantity})`);
      setTimeout(() => setNoticeMsg(null), 3500);
    } catch (err: any) {
      setNoticeMsg(err.message || 'Failed to reserve inventory');
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

  useEffect(() => {
    if (variants.length === 0) {
      setSelectedVariant(null);
      return;
    }

    if (!selectedVariant || !variants.some((variant) => variant.id === selectedVariant.id)) {
      setSelectedVariant(variants[0]);
    }
  }, [variants, selectedVariant]);

  useEffect(() => {
    if (!product) return;
    document.title = `${product.name} | Flash Sale Engine`;
  }, [product]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
        <div className="lg:col-span-7 aspect-square bg-raised rounded-card"></div>
        <div className="lg:col-span-5 space-y-6">
          <div className="h-6 bg-raised rounded w-32"></div>
          <div className="h-10 bg-raised rounded w-3/4"></div>
          <div className="h-8 bg-raised rounded w-1/3"></div>
          <div className="h-32 bg-raised rounded-card"></div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="bg-surface border border-rose/40 rounded-card p-12 text-center space-y-4 font-mono">
        <div className="text-rose text-sm font-semibold">PRODUCT NOT FOUND ON FLOOR</div>
        <div className="text-text-mute text-xs">{(error as any)?.message || 'The requested product could not be loaded.'}</div>
        <Link
          to="/products"
          className="inline-block bg-amber text-on-amber font-sans font-semibold text-xs px-5 py-2.5 rounded-card hover:bg-amber-press transition-colors"
        >
          ← RETURN TO THE FLOOR
        </Link>
      </div>
    );
  }

  const discountPct = Number((product as any).discount_percentage) || 0;
  const originalPrice = Number(product.price) || 0;

  return (
    <div className="space-y-12">
      {/* Breadcrumb / Back Link */}
      <div>
        <Link
          to="/products"
          className="inline-flex items-center gap-1 font-mono text-xs text-text-mute hover:text-text transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>BACK TO THE FLOOR</span>
        </Link>
      </div>

      {/* Notice Banner */}
      {noticeMsg && (
        <div className="bg-amber-soft border border-amber/40 text-amber font-mono text-xs p-3.5 rounded-card flex items-center justify-between">
          <span>● {noticeMsg}</span>
          <Link to="/cart" className="underline font-bold hover:text-text">
            VIEW CART →
          </Link>
        </div>
      )}

      {/* 2-Column 7/5 Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        
        {/* Left Column (Gallery) — 7 cols */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Large Image */}
          <div className="relative aspect-square w-full bg-raised border border-line rounded-card overflow-hidden">
            <img
              src={images[selectedImageIndex] || images[0]}
              alt={product.name}
              className="w-full h-full object-cover object-center"
            />
            {isLive && (
              <div className="absolute top-4 left-4 bg-amber-soft border border-amber/40 text-amber px-2.5 py-1 rounded-pill font-mono text-[11px] font-bold tracking-wider flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber animate-signal-pulse" />
                <span>LIVE DROP</span>
              </div>
            )}
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImageIndex(i)}
                  className={`w-20 h-20 flex-shrink-0 bg-raised border rounded-card overflow-hidden transition-all ${
                    selectedImageIndex === i
                      ? 'border-amber ring-1 ring-amber'
                      : 'border-line hover:border-line-strong'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Feature Specs Accordion Strip */}
          <div className="bg-surface border border-line rounded-card p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center gap-3 text-text">
              <ShieldCheck className="w-4 h-4 text-mint" />
              <span>AUTHENTICITY GUARANTEED · DIRECT WAREHOUSE DROP</span>
            </div>
            <div className="flex items-center gap-3 text-text">
              <Truck className="w-4 h-4 text-sky" />
              <span>DISPATCH WITHIN 24 HOURS · REAL-TIME STRIPE ESCROW</span>
            </div>
            <div className="flex items-center gap-3 text-text">
              <RotateCcw className="w-4 h-4 text-amber" />
              <span>14-DAY RETURN WINDOW FOR UNOPENED COMMODITY LOTS</span>
            </div>
          </div>
        </div>

        {/* Right Column (Sticky Spec Sheet) — 5 cols */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24 bg-surface border border-line rounded-card p-6 sm:p-8">
          {/* Header & Meta */}
          <div className="space-y-2 border-b border-line pb-4">
            <div className="flex items-center justify-between font-mono text-xs text-text-mute">
              <span className="uppercase">
                {typeof product.category === 'string' ? product.category : product.category?.name || 'CATALOG'}
              </span>
              <span>SKU: {selectedVariant?.sku || product.sku || 'FSE-COMMODITY'}</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-text tracking-tight">
              {product.name}
            </h1>
            <div className="flex items-center gap-2 text-xs font-mono text-text-mute pt-1">
              <span className="text-amber font-semibold">★★★★☆ 4.6</span>
              <span>·</span>
              <a href="#reviews" className="hover:text-text underline">
                {reviews.length} reviews
              </a>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-1">
            <Eyebrow className="text-text-mute block">PRICE</Eyebrow>
            <div className="flex items-baseline gap-3">
              <Money
                amount={activePrice}
                originalAmount={discountPct > 0 ? originalPrice : null}
                size="xl"
              />
              {discountPct > 0 && (
                <span className="bg-amber-soft border border-amber/30 text-amber px-2 py-0.5 font-mono text-xs font-bold rounded">
                  SAVE {discountPct}%
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-text-mute pt-1">
              Holds active for 10:00 minutes upon checkout placement.
            </p>
          </div>

          {/* Variant Selector */}
          <VariantPicker
            variants={variants}
            selectedVariantId={selectedVariant?.id || null}
            onSelectVariant={(v) => setSelectedVariant(v)}
          />

          {/* Stock Level Indicator */}
          <div className="space-y-2 pt-2 border-t border-line">
            <StockBar stock={activeStock} maxStock={50} variant="continuous" />
          </div>

          {/* Quantity Stepper & Actions */}
          <div className="space-y-3 pt-4 border-t border-line">
            <div className="flex items-center gap-3">
              {/* Stepper (999px pill) */}
              <div className="flex items-center bg-raised border border-line rounded-pill px-2 py-1 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isOut}
                  className="w-7 h-7 flex items-center justify-center text-text-dim hover:text-text disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-bold text-text tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(activeStock, q + 1))}
                  disabled={quantity >= activeStock || isOut}
                  className="w-7 h-7 flex items-center justify-center text-text-dim hover:text-text disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOut || isAddingToCart}
                className="flex-1 bg-amber text-on-amber hover:bg-amber-press disabled:bg-raised disabled:text-text-mute disabled:cursor-not-allowed h-11 px-6 rounded-card font-sans font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isAddingToCart ? (
                  <span>RESERVING INVENTORY...</span>
                ) : isOut ? (
                  <span>SOLD OUT</span>
                ) : (
                  <span>ADD TO CART — ${(activePrice * quantity).toFixed(2)}</span>
                )}
              </button>

              {/* Wishlist Button */}
              <button
                type="button"
                onClick={handleWishlistToggle}
                className={`w-11 h-11 flex items-center justify-center rounded-card border transition-colors ${
                  isWishlisted
                    ? 'bg-amber-soft border-amber text-amber'
                    : 'bg-raised border-line text-text-dim hover:text-text hover:border-line-strong'
                }`}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="pt-4 border-t border-line">
              <Eyebrow className="text-text-mute mb-2 block">DESCRIPTION</Eyebrow>
              <p className="text-xs font-sans text-text-dim leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div id="reviews" className="border-t border-line pt-12 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Eyebrow className="text-text-mute block">VERIFIED FEEDBACK</Eyebrow>
            <h2 className="font-display text-2xl font-bold text-text">Customer Reviews & Ratings</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 bg-surface border border-line rounded-card p-6">
            <ReviewForm
              productId={product.id}
              onReviewSubmitted={() => refetchReviews()}
            />
          </div>
          <div className="lg:col-span-8 bg-surface border border-line rounded-card p-6">
            <ReviewList reviews={reviews} />
          </div>
        </div>
      </div>
    </div>
  );
};
