import React from 'react';
import { Link } from 'react-router-dom';
import { Eyebrow } from '../components/ui/Eyebrow';
import { AlertTriangle, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto py-24 text-center space-y-6 bg-surface rounded-card p-8 border border-line">
      <div className="w-14 h-14 rounded-full bg-raised border border-line text-amber flex items-center justify-center mx-auto">
        <AlertTriangle className="w-7 h-7" />
      </div>
      <div className="space-y-2">
        <Eyebrow className="text-amber block font-bold">ROUTE UNREACHABLE</Eyebrow>
        <h1 className="font-display text-5xl font-bold text-text">404</h1>
        <h2 className="text-base font-bold text-text">Page Not Located</h2>
        <p className="text-text-mute text-xs">The route you are trying to access does not exist on the commodity trading floor.</p>
      </div>
      <Link
        to="/products"
        className="inline-flex items-center space-x-2 bg-amber hover:bg-amber-press text-on-amber font-sans font-bold text-xs uppercase px-6 py-3 rounded-card transition-colors shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Floor</span>
      </Link>
    </div>
  );
};
