import React from 'react';
import { Link } from 'react-router-dom';

interface WordmarkProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

export const Wordmark: React.FC<WordmarkProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-base sm:text-lg',
    md: 'text-xl sm:text-2xl',
    lg: 'text-3xl sm:text-4xl',
    hero: 'text-4xl sm:text-5xl md:text-6xl',
  }[size];

  return (
    <Link
      to="/products"
      className={`font-display font-bold tracking-tight select-none inline-flex items-center space-x-1 ${sizeClasses} ${className}`}
      aria-label="Flash Sale Engine Home"
    >
      <span className="text-text tracking-tight">FLASH</span>
      <span className="w-2 h-2 bg-amber rounded-full inline-block mx-1 animate-signal-pulse" aria-hidden="true" />
      <span className="text-text tracking-tight">SALE</span>
    </Link>
  );
};
