import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../../types/api';
import { Numeric } from '../ui/Numeric';
import { Eyebrow } from '../ui/Eyebrow';

interface ProductCardProps {
  product: Product;
  issueNumber?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, issueNumber }) => {
  const stock = product.available_stock ?? product.total_stock ?? 0;
  const isLive = stock > 0 && stock <= 15;
  const issueLabel = issueNumber || (product.sku ? `SKU: ${product.sku.toUpperCase()}` : `Nº ${String(product.id).slice(0, 8).toUpperCase()}`);

  const defaultImg =
    product.images && product.images.length > 0
      ? product.images[0]
      : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';

  // Compute monospace block character stock representation (8 characters total)
  const maxStockReference = 50;
  const filledBlocksCount = Math.min(8, Math.max(0, Math.ceil((stock / maxStockReference) * 8)));
  const emptyBlocksCount = 8 - filledBlocksCount;
  const stockBlocksStr = '▓'.repeat(filledBlocksCount) + '░'.repeat(emptyBlocksCount);

  // Stock color logic: >30% -> --gain, 10-30% -> --warn, <10% -> --signal
  let stockColorClass = 'text-gain';
  if (stock <= 5) stockColorClass = 'text-signal';
  else if (stock <= 15) stockColorClass = 'text-warn';

  const discountPct = Number((product as any).discount_percentage) || 0;
  const originalPrice = Number(product.price) || 0;
  const numericPrice = discountPct > 0
    ? Number((product as any).sale_price) || Math.round(originalPrice * (1 - discountPct / 100) * 100) / 100
    : originalPrice;

  return (
    <Link
      to={`/products/${product.id}`}
      className="group relative bg-paper border border-rule rounded-none p-4 flex flex-col justify-between transition-colors hover:bg-paper-sunk/30 block"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between font-mono text-[11px] text-ash pb-3 border-b border-rule/50">
        <span>{issueLabel}</span>
        {isLive && (
          <div className="flex items-center space-x-1.5 text-signal">
            <span className="w-[4px] h-[14px] bg-signal inline-block" />
            <span className="font-mono text-[11px] font-semibold tracking-wider">LIVE</span>
          </div>
        )}
      </div>

      {/* Image Well (Square 1:1) */}
      <div className="relative aspect-square w-full bg-paper-sunk border border-rule my-4 overflow-hidden">
        <img
          src={defaultImg}
          alt={product.name}
          className="w-full h-full object-cover object-center"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
          }}
        />

        {/* Hover Crosshair Overlay */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-ink font-mono text-xs">
          ┼
        </div>
      </div>

      {/* Product Meta */}
      <div className="space-y-1">
        <h3 className="font-sans text-[18px] leading-[24px] font-medium text-ink line-clamp-1">
          {product.name}
        </h3>
        <Eyebrow className="text-ash block">
          {typeof product.category === 'string' ? product.category : product.category?.name || 'CATALOG'}
        </Eyebrow>
      </div>

      {/* Pricing & Monospace Block Stock Gauge */}
      <div className="pt-4 mt-4 border-t border-rule/50 space-y-2">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline space-x-2">
            <Numeric
              value={numericPrice}
              format="price"
              zeroPadInt={3}
              className="text-[20px] leading-[24px] text-ink font-medium"
            />
            {discountPct > 0 && (
              <span className="line-through text-ash font-mono text-xs">
                ${originalPrice.toFixed(2)}
              </span>
            )}
          </div>
          {discountPct > 0 && (
            <span className="bg-signal text-paper px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider">
              SAVE {discountPct}%
            </span>
          )}
        </div>

        {/* Monospace Block Characters Gauge */}
        <div className={`flex items-center justify-between font-mono text-[12px] ${stockColorClass}`}>
          <span className="tracking-widest">{stockBlocksStr}</span>
          <Numeric value={stock} format="integer" zeroPadInt={2} className="ml-2 font-semibold" />
        </div>
      </div>
    </Link>
  );
};
