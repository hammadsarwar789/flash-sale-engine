import React from 'react';

interface StockBarProps {
  stock: number;
  maxStock?: number;
  variant?: 'segmented' | 'continuous';
  showLabel?: boolean;
  className?: string;
}

export const StockBar: React.FC<StockBarProps> = ({
  stock,
  maxStock = 50,
  variant = 'segmented',
  showLabel = true,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((stock / maxStock) * 100)));
  const isOutOfStock = stock <= 0;
  const isUrgent = stock > 0 && (stock <= 5 || percentage <= 10);
  const isModerate = stock > 5 && percentage <= 30;

  // Segmented block bar logic (8 blocks)
  const totalBlocks = 8;
  const filledBlocks = isOutOfStock ? 0 : Math.min(totalBlocks, Math.max(1, Math.ceil((percentage / 100) * totalBlocks)));
  const emptyBlocks = totalBlocks - filledBlocks;
  const blocksString = '▓'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

  let textColor = 'text-mint';
  let barColor = 'bg-mint';
  let label = `${stock} IN STOCK`;

  if (isOutOfStock) {
    textColor = 'text-rose';
    barColor = 'bg-rose';
    label = 'SOLD OUT';
  } else if (isUrgent) {
    textColor = 'text-amber';
    barColor = 'bg-amber animate-signal-pulse';
    label = `${stock} LEFT`;
  } else if (isModerate) {
    textColor = 'text-amber';
    barColor = 'bg-amber';
    label = `${stock} LEFT`;
  }

  if (variant === 'segmented') {
    return (
      <div className={`flex items-center justify-between font-mono text-[12px] tabular-nums ${textColor} ${className}`}>
        <span className={`tracking-widest ${isUrgent ? 'animate-signal-pulse' : ''}`}>{blocksString}</span>
        {showLabel && (
          <span className="font-semibold ml-2">
            {isOutOfStock ? 'SOLD OUT' : `${stock.toString().padStart(2, '0')}`}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 font-mono text-[12px] tabular-nums ${className}`}>
      <div className="h-1.5 w-full bg-line rounded-pill overflow-hidden">
        <div
          className={`h-full rounded-pill transition-all duration-300 ${barColor}`}
          style={{ width: `${isOutOfStock ? 0 : Math.max(5, percentage)}%` }}
        />
      </div>
      {showLabel && (
        <div className={`flex items-center justify-between text-[11px] ${textColor}`}>
          <span className="font-semibold uppercase tracking-wider">{label}</span>
          <span className="text-text-mute">{stock} UNITS</span>
        </div>
      )}
    </div>
  );
};
