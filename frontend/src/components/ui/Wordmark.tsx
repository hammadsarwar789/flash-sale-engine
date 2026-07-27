import React from 'react';
import { Link } from 'react-router-dom';

interface WordmarkProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

export const Wordmark: React.FC<WordmarkProps> = ({ className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    hero: 'text-6xl md:text-8xl',
  }[size];

  return (
    <Link to="/products" className={`font-serif tracking-tight select-none inline-flex items-center ${sizeClasses} ${className}`}>
      <span className="text-ink">FLASH</span>
      <span className="text-signal mx-0.5 font-sans font-light">/</span>
      <span className="text-ink">SALE</span>
    </Link>
  );
};
