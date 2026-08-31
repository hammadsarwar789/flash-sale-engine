import React from 'react';

interface Props {
  productId: string;
  isListed: boolean;
  syncStatus?: string;
  onToggle: (productId: string, newValue: boolean) => void;
}

export const ShopifyToggle: React.FC<Props> = ({ productId, isListed, syncStatus = 'UNPUBLISHED', onToggle }) => {
  const isCurrentlySynced = syncStatus.toUpperCase() === 'SYNCED';
  const isChecked = isListed || isCurrentlySynced;

  let badgeStyle = 'bg-raised text-text-mute border-line';
  if (syncStatus.toUpperCase() === 'SYNCED') {
    badgeStyle = 'bg-mint-soft text-mint border-mint/40';
  } else if (syncStatus.toUpperCase() === 'PENDING') {
    badgeStyle = 'bg-amber-soft text-amber border-amber/40';
  } else if (syncStatus.toUpperCase() === 'FAILED') {
    badgeStyle = 'bg-rose-soft text-rose border-rose/40';
  }

  return (
    <div className="inline-flex flex-col gap-1 font-mono">
      <div className="flex items-center gap-2">
        <label className="flex items-center cursor-pointer gap-1.5 select-none">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => onToggle(productId, e.target.checked)}
            className="rounded border-line text-amber focus:ring-sky cursor-pointer"
          />
          <span className="text-[11px] font-semibold text-text">Shopify Sync</span>
        </label>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${badgeStyle}`}>
          {syncStatus.toUpperCase()}
        </span>
      </div>

      {isChecked && (
        <button
          type="button"
          onClick={() => onToggle(productId, false)}
          className="text-[10px] text-rose hover:underline text-left p-0 font-mono transition-colors"
        >
          [ Remove from Shopify ]
        </button>
      )}
    </div>
  );
};
