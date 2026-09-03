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
  className = '',
}) => {
  const numericVal = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const formattedCurrent = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numericVal);

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
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(Number(originalAmount))}
        </span>
      )}
    </div>
  );
};
