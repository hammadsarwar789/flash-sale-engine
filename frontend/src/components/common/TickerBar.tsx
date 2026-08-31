import React, { useEffect, useState } from 'react';
import { productsApi } from '../../api/products';
import { Product } from '../../types/api';

export const TickerBar: React.FC = () => {
  const [tickerItems, setTickerItems] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      try {
        const response = await productsApi.getProducts({ per_page: 50 });
        const products: Product[] = response?.items || [];

        if (!isMounted) return;

        if (products.length > 0) {
          const onSaleProducts = products.filter(
            (p) =>
              ((p as any).discount_percentage && (p as any).discount_percentage > 0) ||
              ((p as any).discount && (p as any).discount > 0) ||
              (p.available_stock > 0 && p.available_stock <= 20)
          );

          const selectedProducts =
            onSaleProducts.length > 0
              ? onSaleProducts
              : [...products].sort((a, b) => (b.available_stock || 0) - (a.available_stock || 0));

          const formattedEvents = selectedProducts.map((product) => {
            const name = product.name.toUpperCase();
            const price = typeof product.price === 'number' ? `$${product.price.toFixed(2)}` : `$${product.price}`;
            const discount = (product as any).discount_percentage || (product as any).discount;

            if (product.available_stock === 0) {
              return `SOLD OUT: ${name}`;
            }

            if (discount && discount > 0) {
              return `DROP: ${name} — ${discount}% OFF (${price})${product.available_stock > 0 ? ` · ${product.available_stock} LEFT` : ''}`;
            }

            if (product.available_stock > 0 && product.available_stock <= 15) {
              return `▲ SCARCITY: ${name} — ONLY ${product.available_stock} LEFT (${price})`;
            }

            return `LIVE: ${name} · ${price} (${product.available_stock} IN STOCK)`;
          });

          setTickerItems(formattedEvents);
        }
      } catch (err) {
        // Retain current items on error
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProducts();
    const interval = setInterval(fetchProducts, 45000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const displayItems = tickerItems.length > 0
    ? tickerItems
    : loading
      ? ['CONNECTING TO REAL-TIME COMMODITY FEED...', 'ORDERS/MIN: 428', 'NEXT DROP IN 00:14:22']
      : ['FLASH SALE ENGINE LIVE', 'ORDERS/MIN: 428', 'SETTLEMENT: STRIPE WEBHOOK ACTIVE'];

  const fullMarqueeText = displayItems.join('  ·  ') + '  ·  ';

  return (
    <aside 
      className="h-9 bg-surface text-text-dim border-b border-line flex items-center overflow-hidden text-[12px] font-mono uppercase tracking-wider relative z-50 select-none"
      aria-label="Live Commodity & Flash Sale Ticker"
    >
      {/* Static Left Badge */}
      <div className="bg-raised px-3 py-1.5 flex items-center space-x-2 border-r border-line flex-shrink-0 z-10">
        <span className="w-1.5 h-1.5 bg-amber rounded-full animate-signal-pulse inline-block" aria-hidden="true" />
        <span className="font-bold text-amber tracking-widest text-[11px]">LIVE</span>
      </div>

      {/* Screen Reader Summary */}
      <div className="sr-only" aria-live="polite">
        Flash Sale Engine Live Commodity Ticker.
      </div>

      {/* Scrolling Marquee */}
      <div className="overflow-hidden flex-1 relative flex items-center" aria-hidden="true">
        <div className="animate-marquee whitespace-nowrap">
          <span className="text-text-dim">{fullMarqueeText}</span>
          <span className="text-text-dim">{fullMarqueeText}</span>
        </div>
      </div>
    </aside>
  );
};
