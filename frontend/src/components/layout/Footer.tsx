import React from 'react';
import { Link } from 'react-router-dom';
import { Wordmark } from '../ui/Wordmark';
import { Eyebrow } from '../ui/Eyebrow';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-ink text-bone border-t border-rule mt-24">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-sm font-sans">
          
          {/* Column 1: Colophon */}
          <div className="space-y-4">
            <Wordmark size="md" className="[&_span.text-ink]:text-bone" />
            <p className="text-ash text-xs leading-relaxed max-w-sm">
              High-concurrency inventory reservation engine and live flash sale market. Built for low-latency order placement under extreme load.
            </p>
            <div className="font-mono text-[11px] text-ash space-x-2 pt-2">
              <span>BUILD: 0x8F92A</span>
              <span>·</span>
              <span>REGION: US-EAST-1</span>
              <span>·</span>
              <span>LATENCY: 12ms</span>
            </div>
          </div>

          {/* Column 2: Navigation Columns */}
          <div className="grid grid-cols-2 gap-8 text-xs font-mono">
            <div>
              <Eyebrow className="text-ash mb-3 block">Catalog</Eyebrow>
              <ul className="space-y-2">
                <li><Link to="/products" className="text-bone/80 hover:text-bone">ALL DROPS</Link></li>
                <li><Link to="/products?category=Outerwear" className="text-bone/80 hover:text-bone">OUTERWEAR</Link></li>
                <li><Link to="/products?category=Footwear" className="text-bone/80 hover:text-bone">FOOTWEAR</Link></li>
                <li><Link to="/products?category=Tech" className="text-bone/80 hover:text-bone">HARDWARE</Link></li>
              </ul>
            </div>
            <div>
              <Eyebrow className="text-ash mb-3 block">Account & System</Eyebrow>
              <ul className="space-y-2">
                <li><Link to="/orders" className="text-bone/80 hover:text-bone">MY ORDERS</Link></li>
                <li><Link to="/cart" className="text-bone/80 hover:text-bone">ACTIVE CART</Link></li>
                <li><Link to="/wishlist" className="text-bone/80 hover:text-bone">SAVED ITEMS</Link></li>
                <li><Link to="/admin" className="text-signal hover:underline font-semibold">ADMIN RAIL</Link></li>
              </ul>
            </div>
          </div>

          {/* Column 3: System Status Metrics */}
          <div className="space-y-4">
            <Eyebrow className="text-ash block">Telemetry Status</Eyebrow>
            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-rule/40 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-gain inline-block" />
                  <span className="text-bone">REST API GATEWAY</span>
                </div>
                <span className="text-ash">99.982%</span>
              </div>
              <div className="flex items-center justify-between border-b border-rule/40 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-gain inline-block" />
                  <span className="text-bone">STRIPE PAYMENTS</span>
                </div>
                <span className="text-ash">100.000%</span>
              </div>
              <div className="flex items-center justify-between border-b border-rule/40 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 bg-gain inline-block" />
                  <span className="text-bone">REDIS LUA LOCKS</span>
                </div>
                <span className="text-ash">99.994%</span>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-rule/60 flex flex-col sm:flex-row justify-between items-center text-[11px] font-mono text-ash">
          <span>© 2026 FLASH SALE ENGINE. ALL RIGHTS RESERVED.</span>
          <span className="mt-2 sm:mt-0">NO GLASS. NO BLUR. FLAT PAPER SURFACES ONLY.</span>
        </div>
      </div>
    </footer>
  );
};
