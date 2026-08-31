import React from 'react';
import { ProductVariant } from '../../types/api';
import { Eyebrow } from '../ui/Eyebrow';
import { Money } from '../ui/Money';

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

  const colors = Array.from(new Set(variants.map((v) => v.color).filter(Boolean))) as string[];
  const sizes = Array.from(new Set(variants.map((v) => v.size).filter(Boolean))) as string[];

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) || variants[0];

  const getColorHex = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('black')) return '#0B0D0C';
    if (lower.includes('sand') || lower.includes('beige')) return '#C8C4B8';
    if (lower.includes('moss') || lower.includes('green')) return '#2E4A3B';
    if (lower.includes('blue') || lower.includes('cyber')) return '#1667B8';
    if (lower.includes('white')) return '#EDEFEA';
    if (lower.includes('amber') || lower.includes('gold')) return '#F2A03D';
    return '#2A332E';
  };

  return (
    <div className="space-y-6 pt-4 border-t border-line">
      <div className="space-y-4">
        {/* Colors Selection */}
        {colors.length > 0 && (
          <div>
            <Eyebrow className="text-text-mute mb-2 block">COLOR</Eyebrow>
            <div className="flex flex-wrap gap-2.5">
              {colors.map((c) => {
                const match = variants.find((v) => v.color === c);
                const isSelected = selectedVariant.color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => match && onSelectVariant(match)}
                    className={`flex items-center space-x-2 px-3 py-1.5 border rounded-card text-xs font-mono transition-all ${
                      isSelected
                        ? 'bg-raised border-amber text-text ring-1 ring-amber'
                        : 'bg-surface border-line text-text-dim hover:border-line-strong'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 border border-line inline-block rounded-full"
                      style={{ backgroundColor: getColorHex(c) }}
                    />
                    <span>{c}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sizes Selection */}
        {sizes.length > 0 && (
          <div>
            <Eyebrow className="text-text-mute mb-2 block">SIZE</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => {
                const match =
                  variants.find((v) => v.size === s && (selectedVariant.color ? v.color === selectedVariant.color : true)) ||
                  variants.find((v) => v.size === s);
                const isSelected = selectedVariant.size === s;
                const isOut = match ? match.available_stock <= 0 : true;

                return (
                  <button
                    key={s}
                    type="button"
                    disabled={isOut || !match}
                    onClick={() => match && onSelectVariant(match)}
                    className={`relative w-11 h-11 border rounded-card font-mono text-xs flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-amber text-on-amber border-amber font-bold'
                        : isOut
                        ? 'bg-raised text-text-mute border-line cursor-not-allowed opacity-50'
                        : 'bg-surface text-text border-line hover:border-line-strong'
                    }`}
                  >
                    <span>{s}</span>
                    {isOut && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[140%] h-[1px] bg-text-mute rotate-45 transform" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Full SKU variants list fallback */}
        {colors.length === 0 && sizes.length === 0 && (
          <div>
            <Eyebrow className="text-text-mute mb-2 block">SELECT SKU VARIANT</Eyebrow>
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
                    className={`p-3 border rounded-card text-left font-mono text-xs flex justify-between items-center transition-colors ${
                      isSelected
                        ? 'bg-raised border-amber text-text ring-1 ring-amber'
                        : isOut
                        ? 'bg-raised text-text-mute opacity-50 cursor-not-allowed border-line'
                        : 'bg-surface text-text border-line hover:border-line-strong'
                    }`}
                  >
                    <div>
                      <span className="font-semibold block text-text">{v.name}</span>
                      <span className="text-[10px] text-text-mute block">SKU: {v.sku}</span>
                    </div>
                    <div className="text-right">
                      <Money amount={Number(v.price)} size="inline" />
                      <span className={`text-[10px] block ${isOut ? 'text-rose' : 'text-mint'}`}>
                        {isOut ? 'SOLD OUT' : `${v.available_stock} LEFT`}
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
