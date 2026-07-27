import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Eyebrow } from '../ui/Eyebrow';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  const quickLinks = [
    { label: 'ALL PRODUCTS & DROPS', path: '/products' },
    { label: 'OUTERWEAR CATEGORY', path: '/products?category_id=outerwear' },
    { label: 'FOOTWEAR CATEGORY', path: '/products?category_id=footwear' },
    { label: 'TECH & DEVICES CATEGORY', path: '/products?category_id=tech' },
    { label: 'MY ORDER HISTORY', path: '/orders' },
    { label: 'ADMIN CONTROL CENTER', path: '/admin' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop: solid ink at 60% opacity, NO blur */}
      <div 
        className="fixed inset-0 bg-ink/60 transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Dialog: max 560px, paper background, 1px rule border, 0 radius */}
      <div className="relative w-full max-w-[560px] bg-paper border border-rule shadow-none z-10 p-0 rounded-none">
        <form onSubmit={handleSearchSubmit} className="border-b border-rule flex items-center px-4 py-3 bg-paper-sunk">
          <Search className="w-5 h-5 text-ash mr-3" />
          <input
            type="text"
            placeholder="Search catalog by product name, SKU, or category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-ink placeholder-ash font-sans text-sm focus:outline-none"
          />
          <button 
            type="button" 
            onClick={onClose}
            className="text-ash hover:text-ink text-xs font-mono border border-rule px-2 py-1 bg-paper"
          >
            ESC
          </button>
        </form>

        <div className="p-4 space-y-4">
          <div>
            <Eyebrow className="text-ash mb-2 block">Quick Commands</Eyebrow>
            <div className="space-y-1">
              {quickLinks.map((link) => (
                <button
                  key={link.path}
                  onClick={() => {
                    navigate(link.path);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-mono text-ink hover:bg-paper-sunk border border-transparent hover:border-rule transition-colors flex items-center justify-between"
                >
                  <span>{link.label}</span>
                  <span className="text-ash">→</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-rule/30 flex justify-between items-center text-[11px] font-mono text-ash">
            <span>Press <kbd className="border border-rule px-1 bg-paper-sunk">RETURN</kbd> to search</span>
            <span><kbd className="border border-rule px-1 bg-paper-sunk">ESC</kbd> to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
