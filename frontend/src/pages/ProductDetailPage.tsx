import React, { useState } from 'react';
import { useEffect } from 'react';
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
import { Numeric } from '../components/ui/Numeric';
import { Eyebrow } from '../components/ui/Eyebrow';

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
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  const isWishlisted = wishlistItems.some((item) => item.product_id === id);
  const wishlistItem = wishlistItems.find((item) => item.product_id === id);

  const activePrice = Number(selectedVariant?.price ?? product?.price ?? 0);
  const activeStock = selectedVariant?.available_stock ?? product?.available_stock ?? product?.total_stock ?? 0;
  const totalStock = product?.total_stock ?? 100;
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
      setNoticeMsg(`RESERVED ITEM: ${product.name} (QTY ${quantity})`);
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

    // Dynamic Page Title & Meta Description
    document.title = `${product.name} | Flash Sale Engine`;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', product.description || `Buy ${product.name} on Flash Sale Engine.`);

    // Dynamic JSON-LD Structured Data
    const schemaData = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      'name': product.name,
      'image': images,
      'description': product.description || product.name,
      'sku': selectedVariant?.sku || product.sku,
      'offers': {
        '@type': 'Offer',
        'priceCurrency': 'USD',
        'price': activePrice,
        'availability': activeStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'product-schema';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);

    return () => {
      document.getElementById('product-schema')?.remove();
    };
  }, [product, selectedVariant, activePrice, activeStock, images]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-paper-sunk border border-rule"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 space-y-4">
            <div className="h-[480px] bg-paper-sunk border border-rule"></div>
          </div>
          <div className="lg:col-span-5 h-[400px] bg-paper-sunk border border-rule"></div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4 border border-loss bg-paper p-8">
        <h2 className="font-serif text-3xl text-ink">Product Not Found</h2>
        <p className="text-ash font-mono text-xs">{(error as any)?.message || 'The requested item floor record does not exist.'}</p>
        <Link to="/products" className="inline-block bg-ink text-paper font-mono text-xs uppercase px-6 py-2">
          ← Return to Floor
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Top Back Link & Notice Banner */}
      <div className="space-y-4">
        <Link to="/products" className="inline-flex items-center space-x-1 font-mono text-xs text-ash hover:text-ink">
          <span>← BACK TO FLOOR</span>
        </Link>

        {noticeMsg && (
          <div className="p-3 border border-gain bg-paper text-gain font-mono text-xs font-semibold flex items-center justify-between">
            <span>{noticeMsg}</span>
            <Link to="/cart" className="underline hover:text-ink">GO TO CART →</Link>
          </div>
        )}
      </div>

      {/* 2-Column PDP Grid (7/5 Split = 60/40 Proportions) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left Column (7 cols): Vertical Image Stack */}
        <div className="lg:col-span-7 space-y-6">
          {images.map((img: string, idx: number) => (
            <div key={idx} className="aspect-square w-full bg-paper-sunk border border-rule overflow-hidden">
              <img
                src={img}
                alt={`${product.name} View ${idx + 1}`}
                fetchPriority={idx === 0 ? 'high' : 'auto'}
                loading={idx === 0 ? 'eager' : 'lazy'}
                decoding={idx === 0 ? 'sync' : 'async'}
                width="800"
                height="800"
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
                }}
              />
            </div>
          ))}
        </div>

        {/* Right Column (5 cols): Sticky Spec Sheet */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28 bg-paper border border-rule p-6">
          
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-rule pb-3 font-mono text-xs text-ash">
            <span>Nº {String(product.id).padStart(3, '0')}</span>
            {isLive && (
              <div className="flex items-center space-x-1 text-signal">
                <span className="w-[4px] h-[14px] bg-signal inline-block" />
                <span className="font-semibold">LIVE</span>
              </div>
            )}
          </div>

          {/* Product Title (Serif 56px) */}
          <h1 className="font-serif text-[42px] sm:text-[56px] leading-[1.0] text-ink font-normal tracking-tight">
            {product.name}
          </h1>

          {/* Meta specs summary table */}
          <div className="border-y border-rule py-3 space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <Eyebrow className="text-ash">SKU</Eyebrow>
              <span className="text-ink">{selectedVariant?.sku || product.sku}</span>
            </div>
            <div className="flex justify-between">
              <Eyebrow className="text-ash">CATEGORY</Eyebrow>
              <span className="text-ink">{typeof product.category === 'string' ? product.category : product.category?.name || 'GENERAL'}</span>
            </div>
            <div className="flex justify-between">
              <Eyebrow className="text-ash">RATING</Eyebrow>
              <span className="text-ink">{(() => {
                if (reviews.length === 0) return '☆☆☆☆☆ NO REVIEWS';
                const avg = reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length;
                const filled = Math.round(avg);
                return '★'.repeat(filled) + '☆'.repeat(5 - filled) + ` ${avg.toFixed(1)} (${reviews.length})`;
              })()}</span>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="space-y-1">
            <Eyebrow className="text-ash block">PRICE</Eyebrow>
            <div className="flex items-baseline space-x-3">
              <Numeric
                value={(product as any)?.discount_percentage > 0 ? ((product as any)?.sale_price || activePrice * (1 - (product as any).discount_percentage / 100)) : activePrice}
                format="price"
                zeroPadInt={3}
                className="text-3xl font-medium text-ink"
              />
              {(product as any)?.discount_percentage > 0 && (
                <>
                  <span className="line-through text-ash font-mono text-sm">
                    ${Number(product.price).toFixed(2)}
                  </span>
                  <span className="bg-signal text-paper px-2 py-0.5 font-mono text-xs font-semibold">
                    SAVE {(product as any).discount_percentage}% OFF
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Variant Picker */}
          {variants.length > 0 && (
            <VariantPicker
              variants={variants}
              selectedVariantId={selectedVariant?.id || null}
              onSelectVariant={(v) => setSelectedVariant(v)}
            />
          )}

          {/* Stock Gauge & Quantity Stepper */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <Eyebrow className="text-ash">STOCK</Eyebrow>
              <span className={`font-semibold ${isOut ? 'text-loss' : isLive ? 'text-warn' : 'text-gain'}`}>
                {isOut ? 'OUT OF STOCK' : (() => {
                  const ratio = Math.min(1, activeStock / Math.max(1, totalStock));
                  const filled = Math.max(1, Math.round(ratio * 8));
                  return '▓'.repeat(filled) + '░'.repeat(8 - filled) + ` ${activeStock} LEFT`;
                })()}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <Eyebrow className="text-ash">QTY</Eyebrow>
              <div className="flex items-center border border-rule bg-paper-sunk">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 text-ink hover:bg-paper font-mono text-sm border-r border-rule flex items-center justify-center"
                >
                  −
                </button>
                <Numeric value={quantity} format="integer" zeroPadInt={2} className="w-12 text-center text-sm font-semibold text-ink" />
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 text-ink hover:bg-paper font-mono text-sm border-l border-rule flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Primary Signal CTA Button */}
          <div className="space-y-3 pt-4 border-t border-rule">
            <button
              onClick={handleAddToCart}
              aria-label={`Add ${product.name} to cart`}
              disabled={isOut || isAddingToCart}
              className="w-full h-14 bg-signal text-signal-ink font-sans text-sm font-semibold uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-50 rounded-none border border-signal"
            >
              {isAddingToCart ? 'RESERVING...' : `ADD TO CART — $${(activePrice * quantity).toFixed(2)}`}
            </button>

            <div className="text-center font-mono text-xs text-ash">─── or ───</div>

            {/* Secondary CTA: Wishlist */}
            <button
              type="button"
              aria-label={isWishlisted ? "Remove product from wishlist" : "Add product to wishlist"}
              onClick={handleWishlistToggle}
              className="w-full text-center font-mono text-xs text-ink underline hover:text-signal uppercase"
            >
              {isWishlisted ? '[ REMOVE FROM WISHLIST ]' : '[ ADD TO WISHLIST ]'}
            </button>
          </div>

        </div>
      </div>

      {/* Below the Fold: Full-Width Reviews Section */}
      <div className="pt-12 border-t border-rule space-y-8">
        <h2 className="font-serif text-3xl text-ink">Floor Reviews & Verified Purchases</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ReviewList reviews={reviews} />
          </div>
          <div className="border border-rule p-6 bg-paper-sunk">
            <ReviewForm productId={product.id} onReviewSubmitted={refetchReviews} />
          </div>
        </div>
      </div>

    </div>
  );
};
