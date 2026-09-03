import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Product } from '../../types/api';
import { Eyebrow } from '../ui/Eyebrow';
import { Money } from '../ui/Money';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Package } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  issueNumber?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart, isAddingToCart } = useCart();
  const toast = useToast();

  const [imageError, setImageError] = useState(false);

  const stock = product.variants && product.variants.length > 0
    ? product.variants.reduce((sum, v) => sum + (v.available_stock || 0), 0)
    : (product.available_stock ?? product.total_stock ?? 0);
  const isSoldOut = stock <= 0;
  const isLowStock = stock > 0 && stock <= 5;
  const isLive = stock > 0 && stock <= 15;
  const variantColors = Array.from(new Set((product.variants || []).map((variant) => variant.color).filter(Boolean))) as string[];

  // Dynamic Image extraction - do NOT hardcode smartwatch fallback
  const rawImage =
    (product.images && product.images.length > 0 && product.images[0]) ||
    (product as any).imageUrl ||
    (product as any).image ||
    null;

  const discountPct = Number((product as any).discount_percentage) || 0;
  const originalPrice = Number(product.price) || 0;
  const numericPrice = discountPct > 0
    ? Number((product as any).sale_price) || Math.round(originalPrice * (1 - discountPct / 100) * 100) / 100
    : originalPrice;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (isSoldOut) {
      toast.error('This product is sold out.');
      return;
    }

    try {
      const defaultVariant = product.variants?.[0];
      await addToCart({
        product_id: product.id,
        variant_id: defaultVariant?.id,
        quantity: 1,
        max_stock: stock,
      });
      toast.success(`Added ${product.name} to cart`);
    } catch {
      // Handled by useCart
    }
  };

  return (
    <Link
      to={`/products/${product.id}`}
      className="group relative bg-surface border border-line rounded-card p-4 flex flex-col justify-between transition-colors hover:border-line-strong hover:bg-raised/40 block"
    >
      {/* Top Header Row (Sanitized Category / Status - No SKU) */}
      <div className="flex items-center justify-between font-mono text-[11px] pb-3 border-b border-line/60">
        {isSoldOut ? (
          <div className="flex items-center space-x-1.5 text-rose font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose inline-block" />
            <span>SOLD OUT</span>
          </div>
        ) : isLowStock ? (
          <div className="flex items-center space-x-1.5 text-amber font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber animate-signal-pulse inline-block" />
            <span>ONLY {stock} LEFT</span>
          </div>
        ) : (
          <span className="text-text-mute uppercase tracking-wider">
            {typeof product.category === 'string' ? product.category : product.category?.name || 'FLASH SALE'}
          </span>
        )}

        {isLive && !isSoldOut && (
          <div className="flex items-center space-x-1.5 text-amber">
            <span className="w-1.5 h-1.5 rounded-full bg-amber animate-signal-pulse inline-block" />
            <span className="font-mono text-[11px] font-bold tracking-wider">LIVE</span>
          </div>
        )}
      </div>

      {/* Product Image Well (10px radius) */}
      <div className="relative aspect-square w-full bg-raised border border-line rounded-card my-4 overflow-hidden">
        {rawImage && !imageError ? (
          <img
            src={rawImage}
            alt={product.name}
            loading="lazy"
            decoding="async"
            width="400"
            height="400"
            className={`w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.02] ${
              isSoldOut ? 'opacity-60 grayscale-[40%]' : ''
            }`}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-raised text-text-mute p-4 select-none">
            <Package className="w-12 h-12 stroke-1 text-text-mute/60 mb-2" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-mute/80 text-center line-clamp-1">
              {typeof product.category === 'string' ? product.category : product.category?.name || 'COMMODITY'}
            </span>
          </div>
        )}

        {isSoldOut && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-rose text-white font-mono text-xs font-bold px-3 py-1 rounded tracking-wider shadow-md">
              SOLD OUT
            </span>
          </div>
        )}

        {/* Hover Crosshair Overlay */}
        {!isSoldOut && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-text font-mono text-xs">
            ┼
          </div>
        )}
      </div>

      {/* Meta info */}
      <div className="space-y-1">
        <h2 className="font-sans text-[17px] leading-[22px] font-medium text-text line-clamp-1">
          {product.name}
        </h2>
        <Eyebrow className="text-text-mute block">
          {typeof product.category === 'string' ? product.category : product.category?.name || 'CATALOG'}
        </Eyebrow>

        {variantColors.length > 0 && (
          <div className="flex items-center space-x-1.5 pt-1">
            {variantColors.slice(0, 4).map((color) => {
              const colorKey = color.toLowerCase();
              const swatch = colorKey.includes('black')
                ? '#0B0D0C'
                : colorKey.includes('gold')
                ? '#B08D57'
                : colorKey.includes('silver') || colorKey.includes('grey') || colorKey.includes('gray')
                ? '#7A847E'
                : colorKey.includes('white')
                ? '#EDEFEA'
                : '#2A332E';

              return (
                <span
                  key={color}
                  title={color}
                  className="inline-flex h-3.5 w-3.5 rounded-full border border-line"
                  style={{ backgroundColor: swatch }}
                />
              );
            })}
            {variantColors.length > 4 && (
              <span className="text-[10px] text-text-mute font-mono">+{variantColors.length - 4}</span>
            )}
          </div>
        )}
      </div>

      {/* Pricing, Retail Stock Status & Primary Action Button */}
      <div className="pt-3 mt-3 border-t border-line/60 space-y-2">
        <div className="flex items-baseline justify-between">
          <Money
            amount={numericPrice}
            originalAmount={discountPct > 0 ? originalPrice : null}
            size="inline"
          />
          {discountPct > 0 && (
            <span className="bg-amber-soft border border-amber/30 text-amber px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider rounded">
              −{discountPct}%
            </span>
          )}
        </div>

        {/* Clean Retail Stock Status (StockBar & numbers completely removed) */}
        <div className="flex items-center justify-between min-h-[18px]">
          {isSoldOut ? (
            <span className="font-mono text-[11px] font-bold text-rose flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose inline-block" />
              Sold Out
            </span>
          ) : isLowStock ? (
            <span className="font-mono text-[11px] font-bold text-amber flex items-center gap-1">
              <span>⚡</span>
              Only {stock} left
            </span>
          ) : (
            <span className="font-mono text-[11px] font-medium text-mint flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-mint inline-block" />
              In Stock
            </span>
          )}
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isSoldOut || isAddingToCart}
          className={`w-full py-2 px-3 rounded-card font-sans font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-sm mt-2 ${
            isSoldOut
              ? 'bg-raised text-text-mute opacity-50 cursor-not-allowed border border-line'
              : 'bg-amber text-on-amber hover:bg-amber-press cursor-pointer'
          }`}
        >
          {isSoldOut ? (
            <span>SOLD OUT</span>
          ) : isAddingToCart ? (
            <span>RESERVING...</span>
          ) : (
            <span>ADD TO CART</span>
          )}
        </button>
      </div>
    </Link>
  );
};
