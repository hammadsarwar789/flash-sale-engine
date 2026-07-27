import React from 'react';

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export const Eyebrow: React.FC<EyebrowProps> = ({
  children,
  className = '',
  as: Component = 'span',
}) => {
  return (
    <Component className={`eyebrow-label ${className}`}>
      {children}
    </Component>
  );
};
