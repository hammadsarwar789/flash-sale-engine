import React from 'react';

export type StatusType =
  | 'PENDING'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'RETURNED'
  | 'LIVE'
  | 'IN_STOCK'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'ADMIN'
  | string;

interface StatusPillProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  label,
  size = 'md',
  className = '',
}) => {
  const norm = status.toUpperCase();
  const displayLabel = label || norm.replace(/_/g, ' ');

  let containerStyle = 'bg-surface border border-line text-text-dim';
  let dotStyle = 'bg-text-mute';
  let isPulse = false;

  switch (norm) {
    case 'PENDING':
      containerStyle = 'bg-sky-soft border border-sky/30 text-sky';
      dotStyle = 'bg-sky';
      break;
    case 'PAID':
      containerStyle = 'bg-mint-soft border border-mint/30 text-mint';
      dotStyle = 'bg-mint';
      break;
    case 'SHIPPED':
      containerStyle = 'bg-surface border border-mint/50 text-mint';
      dotStyle = 'bg-mint';
      break;
    case 'DELIVERED':
      containerStyle = 'bg-mint text-on-amber font-semibold';
      dotStyle = 'bg-on-amber';
      break;
    case 'CANCELLED':
    case 'OUT_OF_STOCK':
      containerStyle = 'bg-rose-soft border border-rose/30 text-rose';
      dotStyle = 'bg-rose';
      break;
    case 'REFUNDED':
      containerStyle = 'bg-rose-soft border border-rose/40 text-rose';
      dotStyle = 'bg-rose';
      break;
    case 'RETURNED':
      containerStyle = 'bg-surface border border-line text-text-mute';
      dotStyle = 'bg-text-mute';
      break;
    case 'LIVE':
      containerStyle = 'bg-amber-soft border border-amber/40 text-amber font-semibold';
      dotStyle = 'bg-amber';
      isPulse = true;
      break;
    case 'LOW_STOCK':
      containerStyle = 'bg-amber-soft border border-amber/30 text-amber';
      dotStyle = 'bg-amber';
      break;
    case 'ADMIN':
      containerStyle = 'bg-violet-soft border border-violet/40 text-violet font-semibold';
      dotStyle = 'bg-violet';
      break;
  }

  const heightClass = size === 'sm' ? 'h-5 px-2 text-[10px]' : 'h-6 px-2.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill font-mono uppercase tracking-wider select-none ${heightClass} ${containerStyle} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full inline-block ${dotStyle} ${isPulse ? 'animate-signal-pulse' : ''}`}
        aria-hidden="true"
      />
      <span>{displayLabel}</span>
    </span>
  );
};
