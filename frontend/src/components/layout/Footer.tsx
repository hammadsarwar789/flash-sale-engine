import React from 'react';
import { Flame, ShieldCheck, Zap, Truck, CreditCard } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800/80 text-slate-400 mt-20">
      {/* Value Proposition Highlights */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-b border-slate-900">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center space-x-3 p-4 rounded-2xl glass-card">
            <Zap className="w-8 h-8 text-cyan-400 flex-shrink-0" />
            <div>
              <h4 className="text-white font-semibold text-sm">Ultra Flash Deals</h4>
              <p className="text-xs text-slate-400">Lua-based real-time stock sync</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-4 rounded-2xl glass-card">
            <Truck className="w-8 h-8 text-cyan-400 flex-shrink-0" />
            <div>
              <h4 className="text-white font-semibold text-sm">Express Shipping</h4>
              <p className="text-xs text-slate-400">Order tracking end-to-end</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-4 rounded-2xl glass-card">
            <ShieldCheck className="w-8 h-8 text-cyan-400 flex-shrink-0" />
            <div>
              <h4 className="text-white font-semibold text-sm">Idempotency Guard</h4>
              <p className="text-xs text-slate-400">Zero double billing on orders</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-4 rounded-2xl glass-card">
            <CreditCard className="w-8 h-8 text-cyan-400 flex-shrink-0" />
            <div>
              <h4 className="text-white font-semibold text-sm">Stripe Payments</h4>
              <p className="text-xs text-slate-400">Encrypted checkout processing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center">
              <Flame className="w-5 h-5 text-slate-950" />
            </div>
            <span className="font-extrabold text-lg text-white">FLASH SALE ENGINE</span>
          </div>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Flash Sale E-Commerce Inc. All rights reserved. High-Scale REST API Engine.
          </p>
        </div>
      </div>
    </footer>
  );
};
