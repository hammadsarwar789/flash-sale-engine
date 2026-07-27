import React from 'react';

type StatusType = 'paid' | 'shipped' | 'delivered' | 'in-stock' | 'pending' | 'low-stock' | 'cancelled' | 'refunded' | 'out-of-stock';

interface StatusDotProps {
  status: StatusType | string;
  className?: string;
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, className = '' }) => {
  const normalized = status.toLowerCase();

  if (['paid', 'shipped', 'delivered', 'in-stock', 'healthy', 'success'].includes(normalized)) {
    return <span className={`inline-block w-1.5 h-1.5 bg-gain rounded-none ${className}`} aria-hidden="true" />;
  }

  if (['pending', 'low-stock', 'warn', 'warning', 'degraded'].includes(normalized)) {
    return <span className={`inline-block w-1.5 h-1.5 border border-warn bg-transparent rounded-none ${className}`} aria-hidden="true" />;
  }

  // Cancelled, refunded, loss, out of stock
  return <span className={`inline-block w-1.5 h-1.5 bg-loss rounded-none ${className}`} aria-hidden="true" />;
};
