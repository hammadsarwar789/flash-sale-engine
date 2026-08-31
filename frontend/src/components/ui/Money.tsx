import React from 'react';

interface MoneyProps {
  amount: number | string;
  originalAmount?: number | string | null;
  size?: 'inline' | 'lg' | 'xl';
  padZeros?: boolean;
  className?: string;
}

export const Money: React.FC<MoneyProps> = ({
  amount,
  originalAmount,
  size = 'inline',
  padZeros = true,
  className = '',
}) => {
  const numericVal = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const parts = numericVal.toFixed(2).split('.');
  const intPart = padZeros && parts[0].length < 3 ? parts[0].padStart(3, '0') : parts[0];
  const formattedCurrent = `$${intPart}.${parts[1]}`;

  const sizeClasses = {
    inline: 'text-[15px] leading-[20px] font-medium',
    lg: 'text-[22px] leading-[26px] font-semibold',
    xl: 'text-[34px] leading-[34px] font-semibold tracking-tight',
  }[size];

  return (
    <div className={`inline-flex items-baseline gap-2 font-mono tabular-nums ${className}`}>
      <span className={`text-text ${sizeClasses}`}>{formattedCurrent}</span>
      {originalAmount && Number(originalAmount) > numericVal && (
        <span className="text-text-mute line-through text-xs font-mono">
          ${Number(originalAmount).toFixed(2)}
        </span>
      )}
    </div>
  );
};
