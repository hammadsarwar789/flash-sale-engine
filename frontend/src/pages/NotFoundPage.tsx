import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto py-24 text-center space-y-6 glass-card rounded-3xl p-8 border border-slate-800">
      <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-cyan-400 flex items-center justify-center mx-auto">
        <Flame className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-black text-white">404</h1>
        <h2 className="text-lg font-bold text-slate-300">Page Not Found</h2>
        <p className="text-slate-400 text-sm">The route you are trying to access does not exist on Flash Sale Engine.</p>
      </div>
      <Link
        to="/products"
        className="inline-flex items-center space-x-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Catalog</span>
      </Link>
    </div>
  );
};
