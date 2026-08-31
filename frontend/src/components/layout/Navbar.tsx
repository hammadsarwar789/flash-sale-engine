import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Menu, X, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { Wordmark } from '../ui/Wordmark';
import { CommandPalette } from '../common/CommandPalette';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { cart } = useCart();
  const { wishlistItems } = useWishlist();
  const location = useLocation();

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const cartItemCount = cart?.item_count || 0;
  const cartSubtotal = cart?.subtotal || 0;
  const wishlistCount = wishlistItems?.length || 0;

  const isActive = (path: string) =>
    location.pathname === path || (path === '/products' && location.pathname === '/');

  const isAdmin = user && ['admin', 'manager', 'super_admin'].includes(user.role);

  const userInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'JD';

  return (
    <>
      <header className="h-16 bg-surface border-b border-line sticky top-0 z-40 flex items-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1360px] w-full mx-auto flex items-center justify-between gap-4">

          {/* Brand Wordmark & Desktop Navigation */}
          <div className="flex items-center space-x-6 lg:space-x-8">
            <Wordmark size="md" />

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6 text-[14px] font-sans">
              <Link
                to="/products"
                className={`relative py-5 transition-colors font-medium ${
                  isActive('/products') ? 'text-text' : 'text-text-dim hover:text-text'
                }`}
              >
                Catalog
                {isActive('/products') && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber" />
                )}
              </Link>

              {isAuthenticated && (
                <Link
                  to="/orders"
                  className={`relative py-5 transition-colors font-medium ${
                    isActive('/orders') ? 'text-text' : 'text-text-dim hover:text-text'
                  }`}
                >
                  Orders
                  {isActive('/orders') && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber" />
                  )}
                </Link>
              )}

              <Link
                to="/wishlist"
                className={`relative py-5 transition-colors font-medium ${
                  isActive('/wishlist') ? 'text-text' : 'text-text-dim hover:text-text'
                }`}
              >
                Wishlist {wishlistCount > 0 && <span className="font-mono text-xs text-text-mute">({wishlistCount})</span>}
                {isActive('/wishlist') && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber" />
                )}
              </Link>

              {isAuthenticated && (
                <Link
                  to="/vendor"
                  className={`relative py-5 transition-colors font-mono text-[12px] uppercase tracking-wider ${
                    isActive('/vendor') ? 'text-amber font-semibold' : 'text-text-mute hover:text-text'
                  }`}
                >
                  Vendor Portal
                  {isActive('/vendor') && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber" />
                  )}
                </Link>
              )}

              {isAuthenticated && (
                <Link
                  to="/support"
                  className={`relative py-5 transition-colors font-mono text-[12px] uppercase tracking-wider ${
                    isActive('/support') ? 'text-amber font-semibold' : 'text-text-mute hover:text-text'
                  }`}
                >
                  Support Desk
                  {isActive('/support') && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber" />
                  )}
                </Link>
              )}

              {isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1 bg-violet-soft border border-violet/40 text-violet px-2.5 py-1 rounded-pill text-[11px] font-mono font-bold tracking-wider hover:bg-violet/20 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-violet" />
                  ADMIN
                </Link>
              )}
            </nav>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center space-x-3">
            {/* Search Command Palette Trigger Chip */}
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-raised border border-line rounded-card text-text-mute hover:text-text hover:border-line-strong transition-colors text-xs font-mono"
              title="Quick Search (Cmd+K / Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search products</span>
              <kbd className="bg-overlay px-1.5 py-0.5 rounded text-[10px] text-text-dim border border-line">⌘K</kbd>
            </button>

            {/* Mobile Search Icon Button */}
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="sm:hidden p-2 text-text-dim hover:text-text rounded-card hover:bg-raised transition-colors"
              aria-label="Open Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Cart Button */}
            <Link
              to="/cart"
              className="flex items-center space-x-2 px-3 py-1.5 bg-raised border border-line rounded-card hover:border-line-strong hover:bg-overlay transition-colors text-xs font-mono text-text"
            >
              <span className="text-text-dim">Cart</span>
              <span className="w-1 h-1 rounded-full bg-line-strong" />
              <span className="bg-amber text-on-amber font-bold px-1.5 py-0.2 rounded-pill text-[11px]">
                {cartItemCount}
              </span>
              <span className="hidden sm:inline font-semibold text-text tabular-nums">
                ${cartSubtotal.toFixed(2)}
              </span>
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-text-dim hover:text-text rounded-card hover:bg-raised transition-colors"
              title={theme === 'night' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle visual theme"
            >
              {theme === 'night' ? <Sun className="w-4 h-4 text-amber" /> : <Moon className="w-4 h-4 text-text-dim" />}
            </button>

            {/* Authentication / User Avatar */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="w-9 h-9 rounded-card bg-raised border border-line text-text font-display font-bold text-xs flex items-center justify-center hover:border-line-strong transition-colors"
                  aria-label="User profile menu"
                >
                  {userInitials}
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-overlay border border-line-strong rounded-card shadow-overlay py-2 z-50 text-xs font-mono">
                    <div className="px-3 py-2 border-b border-line">
                      <div className="text-text font-semibold truncate">{user?.email}</div>
                      <div className="text-text-mute text-[10px] uppercase">{user?.role}</div>
                    </div>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="block px-3 py-2 text-violet hover:bg-raised transition-colors"
                      >
                        ● Admin Control Floor
                      </Link>
                    )}
                    <Link
                      to="/orders"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="block px-3 py-2 text-text hover:bg-raised transition-colors"
                    >
                      My Orders & History
                    </Link>
                    <Link
                      to="/wishlist"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="block px-3 py-2 text-text hover:bg-raised transition-colors"
                    >
                      Saved Wishlist
                    </Link>
                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3 py-2 text-rose hover:bg-raised transition-colors border-t border-line mt-1"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-amber text-on-amber px-3.5 py-1.5 rounded-card text-xs font-sans font-semibold hover:bg-amber-press transition-colors"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-text-dim hover:text-text rounded-card hover:bg-raised transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-surface border-b border-line px-4 py-4 space-y-3 text-sm font-sans z-30">
          <Link
            to="/products"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-text font-medium border-b border-line/50"
          >
            Catalog
          </Link>
          {isAuthenticated && (
            <Link
              to="/orders"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-text font-medium border-b border-line/50"
            >
              Orders
            </Link>
          )}
          <Link
            to="/wishlist"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-text font-medium border-b border-line/50"
          >
            Wishlist ({wishlistCount})
          </Link>
          {isAuthenticated && (
            <Link
              to="/vendor"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-amber font-mono text-xs uppercase"
            >
              Vendor Portal
            </Link>
          )}
          {isAuthenticated && (
            <Link
              to="/support"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-amber font-mono text-xs uppercase"
            >
              Support Desk
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-violet font-mono text-xs uppercase font-bold"
            >
              Admin Dashboard
            </Link>
          )}
        </div>
      )}

      {/* Search Command Palette Modal */}
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </>
  );
};
