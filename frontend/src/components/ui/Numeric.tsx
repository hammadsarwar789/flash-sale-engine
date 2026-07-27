import React from 'react';

interface NumericProps {
  value: number | string;
  format?: 'price' | 'integer' | 'raw';
  zeroPadInt?: number; // Integer digits to zero-pad (e.g. 3 -> 099.99)
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const Numeric: React.FC<NumericProps> = ({
  value,
  format = 'raw',
  zeroPadInt,
  className = '',
  prefix = '',
  suffix = '',
}) => {
  let displayValue = String(value);

  if (format === 'price' && typeof value === 'number') {
    const parts = value.toFixed(2).split('.');
    let intPart = parts[0];
    const decPart = parts[1];

    if (zeroPadInt && intPart.length < zeroPadInt) {
      intPart = intPart.padStart(zeroPadInt, '0');
    }

    displayValue = `$${intPart}.${decPart}`;
  } else if (format === 'integer' && typeof value === 'number') {
    let intStr = String(Math.floor(value));
    if (zeroPadInt && intStr.length < zeroPadInt) {
      intStr = intStr.padStart(zeroPadInt, '0');
    }
    displayValue = intStr;
  }

  return (
    <span className={`font-mono numeric-tabular ${className}`}>
      {prefix}{displayValue}{suffix}
    </span>
  );
};
