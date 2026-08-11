import React, { useEffect, useState } from 'react';
import { productsApi } from '../../api/products';
import { Product } from '../../types/api';

export const TickerBar: React.FC = () => {
  const [tickerItems, setTickerItems] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      try {
        const response = await productsApi.getProducts({ per_page: 50 });
        const products: Product[] = response?.items || [];

        if (!isMounted) return;

        if (products.length > 0) {
          // 1. Identify products on sale (discount > 0 or low stock alert <= 20)
          const onSaleProducts = products.filter(
            (p) =>
              ((p as any).discount_percentage && (p as any).discount_percentage > 0) ||
              ((p as any).discount && (p as any).discount > 0) ||
              (p.available_stock > 0 && p.available_stock <= 20)
          );

          // 2. If products are on sale, display them; otherwise fallback to trending / top-stock products
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
              return `🔥 SALE: ${name} — ${discount}% OFF (${price})${product.available_stock > 0 ? ` — ONLY ${product.available_stock} LEFT` : ''}`;
            }

            if (product.available_stock > 0 && product.available_stock <= 15) {
              return `▲ LIMITED STOCK: ${name} — ONLY ${product.available_stock} LEFT (${price})`;
            }

            return `🔥 TRENDING: ${name} — ${price}${product.available_stock > 0 ? ` (${product.available_stock} IN STOCK)` : ''}`;
          });

          formattedEvents.push('⚡ FLASH SALE FLOOR LIVE — REAL-TIME INVENTORY HOLD ACTIVE');
          setTickerItems(formattedEvents);
        }
      } catch (err) {
        // Silently retain current or default items on error
      }
    };

    fetchProducts();
    const interval = setInterval(fetchProducts, 60000); // Auto-refresh ticker items every 60 seconds

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const defaultEvents = [
    'FLASH SALE FLOOR LIVE — REAL-TIME INVENTORY HOLD ACTIVE',
    '⚡ INSTANT 1-CLICK CHECKOUT ENABLED',
    '🚀 REAL-TIME STOCK RESERVATION ACTIVE',
  ];

  const events = tickerItems.length > 0 ? tickerItems : defaultEvents;
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
        Flash Sale Engine Live. Active sale drops and trending products in progress.
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
