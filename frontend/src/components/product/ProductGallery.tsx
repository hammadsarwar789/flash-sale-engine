import React from 'react';

interface ProductImageProps {
  src: string;
  alt: string;
  isHero?: boolean;
  className?: string;
}

export const ProductHeroImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  isHero = false,
  className = '',
}) => {
  return (
    <div className={`relative aspect-square overflow-hidden bg-paper-sunk border border-rule ${className}`}>
      <img
        src={src.includes('?') ? src : `${src}?auto=format&fit=crop&w=1200&q=85`}
        alt={alt}
        // Apply high priority hints ONLY for the main hero image
        fetchPriority={isHero ? 'high' : 'auto'}
        loading={isHero ? 'eager' : 'lazy'}
        decoding={isHero ? 'sync' : 'async'}
        width="800"
        height="800"
        className="h-full w-full object-cover object-center"
      />
    </div>
  );
};
