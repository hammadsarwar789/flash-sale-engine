import React from 'react';
import { ProductVariant } from '../../types/api';
import { Check, Layers } from 'lucide-react';

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

  const selectedVariant = variants.find((v) => v.id === selectedVariantId) || variants[0];

  return (
    <div className="space-y-4 p-4 rounded-2xl glass-panel border border-cyan-500/20 bg-slate-900/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Select Option / Variant
          </span>
        </div>
        {selectedVariant && (
          <span className="text-xs font-medium text-cyan-400">
            SKU: {selectedVariant.sku}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {variants.map((v) => {
          const isSelected = v.id === selectedVariantId;
          const isOut = v.available_stock <= 0;

          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelectVariant(v)}
              disabled={isOut}
              className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500'
                  : isOut
                  ? 'bg-slate-900/40 border-slate-800 text-slate-600 opacity-60 cursor-not-allowed'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                    isSelected ? 'border-cyan-400 bg-cyan-500' : 'border-slate-600'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                </div>
                <div>
                  <span className="text-sm font-semibold block">{v.name}</span>
                  {(v.size || v.color) && (
                    <span className="text-xs text-slate-400 block">
                      {[v.size, v.color].filter(Boolean).join(' / ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-bold text-slate-100">${Number(v.price).toFixed(2)}</span>
                <span
                  className={`text-[10px] block font-semibold ${
                    isOut ? 'text-rose-500' : v.available_stock <= 5 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {isOut ? 'Out of Stock' : `${v.available_stock} available`}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
