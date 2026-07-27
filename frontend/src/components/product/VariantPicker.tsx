import React from 'react';
import { ProductVariant } from '../../types/api';
import { Eyebrow } from '../ui/Eyebrow';
import { Numeric } from '../ui/Numeric';

interface VariantPickerProps {
  variants: ProductVariant[];
  selectedVariantId: string | null;
  onSelectVariant: (variant: ProductVariant) => void;
}

export const VariantPicker: React.FC<VariantPickerProps> = ({
  variants,
  selectedVariantId,
  onSelectVariant,
}) => {
  if (!variants || variants.length === 0) {
    return null;
  }

  // Extract unique colors and sizes if available
  const colors = Array.from(new Set(variants.map(v => v.color).filter(Boolean))) as string[];
  const sizes = Array.from(new Set(variants.map(v => v.size).filter(Boolean))) as string[];

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) || variants[0];

  // Map color names to approximate CSS colors
  const getColorHex = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('black')) return '#111111';
    if (lower.includes('blue') || lower.includes('cyber')) return '#06b6d4';
    if (lower.includes('white')) return '#FFFFFF';
    if (lower.includes('red') || lower.includes('signal')) return '#E5321B';
    if (lower.includes('grey') || lower.includes('ash')) return '#7A776E';
    return '#3A3A38';
  };

  return (
    <div className="space-y-6 pt-4 border-t border-rule">
      {/* Variant Dropdowns / Grid options */}
      <div className="space-y-4">
        {/* Colors Selection (24px squares) */}
        {colors.length > 0 && (
          <div>
            <Eyebrow className="text-ash mb-2 block">COLOR</Eyebrow>
            <div className="flex flex-wrap gap-3">
              {colors.map((c) => {
                const match = variants.find(v => v.color === c);
                const isSelected = selectedVariant.color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => match && onSelectVariant(match)}
                    className={`group relative flex items-center space-x-2 px-2.5 py-1.5 border border-rule text-xs font-mono transition-all rounded-none ${
                      isSelected ? 'bg-paper-sunk border-ink ring-1 ring-ink' : 'bg-paper hover:bg-paper-sunk'
                    }`}
                  >
                    <span 
                      className="w-3.5 h-3.5 border border-rule inline-block rounded-none"
                      style={{ backgroundColor: getColorHex(c) }}
                    />
                    <span>{c}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sizes Selection (44px squares with diagonal strikethrough for out-of-stock) */}
        {sizes.length > 0 && (
          <div>
            <Eyebrow className="text-ash mb-2 block">SIZE</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => {
                const match = variants.find(v => v.size === s && (selectedVariant.color ? v.color === selectedVariant.color : true)) || variants.find(v => v.size === s);
                const isSelected = selectedVariant.size === s;
                const isOut = match ? match.available_stock <= 0 : true;

                return (
                  <button
                    key={s}
                    type="button"
                    disabled={isOut || !match}
                    onClick={() => match && onSelectVariant(match)}
                    className={`relative w-11 h-11 border border-rule font-mono text-xs flex items-center justify-center transition-all rounded-none ${
                      isSelected
                        ? 'bg-ink text-paper border-ink font-semibold'
                        : isOut
                        ? 'bg-paper-sunk text-ash cursor-not-allowed opacity-60'
                        : 'bg-paper text-ink hover:bg-paper-sunk'
                    }`}
                  >
                    <span>{s}</span>
                    {/* Diagonal strikethrough line drawn corner-to-corner for out of stock */}
                    {isOut && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[140%] h-[1px] bg-ash rotate-45 transform" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Full Variant List Option Buttons if no specific size/color attributes exist */}
        {colors.length === 0 && sizes.length === 0 && (
          <div>
            <Eyebrow className="text-ash mb-2 block">SELECT SKU VARIANT</Eyebrow>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {variants.map((v) => {
                const isSelected = v.id === selectedVariantId;
                const isOut = v.available_stock <= 0;

                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={isOut}
                    onClick={() => onSelectVariant(v)}
                    className={`p-3 border border-rule text-left font-mono text-xs flex justify-between items-center transition-colors rounded-none ${
                      isSelected
                        ? 'bg-ink text-paper border-ink'
                        : isOut
                        ? 'bg-paper-sunk text-ash opacity-60 cursor-not-allowed'
                        : 'bg-paper text-ink hover:bg-paper-sunk'
                    }`}
                  >
                    <div>
                      <span className="font-semibold block">{v.name}</span>
                      <span className="text-[10px] text-ash block">SKU: {v.sku}</span>
                    </div>
                    <div className="text-right">
                      <Numeric value={Number(v.price)} format="price" zeroPadInt={3} />
                      <span className={`text-[10px] block ${isOut ? 'text-loss' : 'text-gain'}`}>
                        {isOut ? 'OUT' : `${v.available_stock} LEFT`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
