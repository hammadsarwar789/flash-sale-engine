import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../../types/api';
import { Eyebrow } from '../ui/Eyebrow';
import { Money } from '../ui/Money';
import { StockBar } from '../ui/StockBar';

interface ProductCardProps {
  product: Product;
  issueNumber?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, issueNumber }) => {
  const stock = product.available_stock ?? product.total_stock ?? 0;
  const isLive = stock > 0 && stock <= 15;
  const issueLabel = issueNumber || (product.sku ? `SKU ${product.sku.toUpperCase()}` : `ID #${String(product.id).slice(0, 8).toUpperCase()}`);
  const variantColors = Array.from(new Set((product.variants || []).map((variant) => variant.color).filter(Boolean))) as string[];

  const defaultImg =
    product.images && product.images.length > 0
      ? product.images[0]
      : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';

  const img400 = defaultImg.includes('unsplash.com')
    ? defaultImg.replace(/w=\d+/, 'w=400')
    : defaultImg;
  const img800 = defaultImg.includes('unsplash.com')
    ? defaultImg.replace(/w=\d+/, 'w=800')
    : defaultImg;

  const discountPct = Number((product as any).discount_percentage) || 0;
  const originalPrice = Number(product.price) || 0;
  const numericPrice = discountPct > 0
    ? Number((product as any).sale_price) || Math.round(originalPrice * (1 - discountPct / 100) * 100) / 100
    : originalPrice;

  return (
    <Link
      to={`/products/${product.id}`}
      className="group relative bg-surface border border-line rounded-card p-4 flex flex-col justify-between transition-colors hover:border-line-strong hover:bg-raised/40 block"
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between font-mono text-[11px] text-text-mute pb-3 border-b border-line/60">
        <span>{issueLabel}</span>
        {isLive && (
          <div className="flex items-center space-x-1.5 text-amber">
            <span className="w-1.5 h-1.5 rounded-full bg-amber animate-signal-pulse inline-block" />
            <span className="font-mono text-[11px] font-bold tracking-wider">LIVE</span>
          </div>
        )}
      </div>

      {/* Product Image Well (10px radius) */}
      <div className="relative aspect-square w-full bg-raised border border-line rounded-card my-4 overflow-hidden">
        <img
          src={img400}
          srcSet={`${img400} 400w, ${img800} 800w`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
          loading="lazy"
          decoding="async"
          alt={product.name}
          width="400"
          height="400"
          className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';
          }}
        />

        {/* Hover Crosshair Overlay */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-text font-mono text-xs">
          ┼
        </div>
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

      {/* Pricing & Monospace Stock Bar */}
      <div className="pt-4 mt-4 border-t border-line/60 space-y-2">
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

        {/* Stock Gauge */}
        <StockBar stock={stock} maxStock={50} variant="segmented" />
      </div>
    </Link>
  );
};
