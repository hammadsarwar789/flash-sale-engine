import React from 'react';

export const TickerBar: React.FC = () => {
  const events = [
    '▲ CYBER JACKET / BLACK / M — 3 LEFT',
    'SOLD OUT: NEON SNEAKERS / SIZE 9',
    'NEW DROP IN 00:14:22',
    'ORDERS/MIN: 428',
    '▲ SIGNAL CAP / RED — 12 LEFT',
    'FLASH SALE FLOOR LIVE — REAL-TIME INVENTORY HOLD ACTIVE',
  ];

  const fullMarqueeText = events.join('  ·  ') + '  ·  ';

  return (
    <aside 
      className="h-8 bg-ink text-signal-ink border-b border-rule flex items-center overflow-hidden text-[12px] font-mono uppercase tracking-wider relative z-50 select-none"
      aria-label="Live Flash Sale Ticker"
    >
      {/* Static Left Badge */}
      <div className="bg-ink px-3 py-1 flex items-center space-x-2 border-r border-rule flex-shrink-0 z-10">
        <span className="w-1.5 h-1.5 bg-signal animate-pulse inline-block" aria-hidden="true" />
        <span className="font-semibold text-signal-ink">LIVE</span>
      </div>

      {/* Screen Reader Only Summary */}
      <div className="sr-only" aria-live="polite">
        Flash Sale Engine Live. Active sale drops in progress. Orders per minute: 428.
      </div>

      {/* Scrolling Marquee */}
      <div className="overflow-hidden flex-1 relative flex items-center" aria-hidden="true">
        <div className="animate-marquee whitespace-nowrap">
          <span>{fullMarqueeText}</span>
          <span>{fullMarqueeText}</span>
        </div>
      </div>
    </aside>
  );
};
