import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';
import { Wordmark } from '../ui/Wordmark';
import { Numeric } from '../ui/Numeric';
import { CommandPalette } from '../common/CommandPalette';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { cart } = useCart();
  const { wishlistItems } = useWishlist();
  const location = useLocation();

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const cartItemCount = cart?.item_count || 0;
  const cartSubtotal = cart?.subtotal || 0;
  const wishlistCount = wishlistItems?.length || 0;

  const isActive = (path: string) => location.pathname === path || (path === '/products' && location.pathname === '/');

  // Compute initials for avatar
  const userInitials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'JD';

  return (
    <>
      <header className="h-[72px] bg-paper border-b border-rule sticky top-0 z-40 flex items-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1440px] w-full mx-auto flex items-center justify-between gap-6">
          
          {/* Brand Wordmark */}
          <div className="flex items-center space-x-8">
            <Wordmark size="md" />

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6 text-sm font-sans">
              <Link
                to="/products"
                className={`relative py-5 transition-colors font-medium ${
                  isActive('/products') ? 'text-ink' : 'text-graphite hover:text-ink'
                }`}
              >
                Catalog
                {isActive('/products') && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-signal" />
                )}
              </Link>

              {isAuthenticated && (
                <Link
                  to="/orders"
                  className={`relative py-5 transition-colors font-medium ${
                    isActive('/orders') ? 'text-ink' : 'text-graphite hover:text-ink'
                  }`}
                >
                  Orders
                  {isActive('/orders') && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-signal" />
                  )}
                </Link>
              )}

              <Link
                to="/wishlist"
                className={`relative py-5 transition-colors font-medium ${
                  isActive('/wishlist') ? 'text-ink' : 'text-graphite hover:text-ink'
                }`}
              >
                Wishlist {wishlistCount > 0 && <span className="font-mono text-xs text-ash">({wishlistCount})</span>}
                {isActive('/wishlist') && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-signal" />
                )}
              </Link>

              {isAuthenticated && (
                <Link
                  to="/vendor"
                  className={`relative py-5 transition-colors font-mono text-xs uppercase tracking-wider ${
                    isActive('/vendor') ? 'text-signal font-semibold' : 'text-ash hover:text-ink'
                  }`}
                >
                  [ VENDOR DESK ]
                  {isActive('/vendor') && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-signal" />
                  )}
                </Link>
              )}

              {isAuthenticated && (
                <Link
                  to="/support"
                  className={`relative py-5 transition-colors font-mono text-xs uppercase tracking-wider ${
                    isActive('/support') ? 'text-signal font-semibold' : 'text-ash hover:text-ink'
                  }`}
                >
                  [ SUPPORT DESK ]
                  {isActive('/support') && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-signal" />
                  )}
                </Link>
              )}

              {/* Admin Link for admin/manager roles */}
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <Link
                  to="/admin"
                  className={`relative py-5 transition-colors font-mono text-xs uppercase tracking-wider ${
                    isActive('/admin') ? 'text-signal font-semibold' : 'text-ash hover:text-ink'
                  }`}
                >
                  [ ADMIN RAIL ]
                  {isActive('/admin') && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-signal" />
                  )}
                </Link>
              )}

              {user?.role === 'stock_operator' && (
                <Link
                  to="/staff"
                  className={`relative py-5 transition-colors font-mono text-xs uppercase tracking-wider ${
                    isActive('/staff') ? 'text-signal font-semibold' : 'text-ash hover:text-ink'
                  }`}
                >
                  [ STAFF RAIL ]
                  {isActive('/staff') && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-signal" />
                  )}
                </Link>
              )}
            </nav>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* Day / Night Theme Conversion Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-paper border border-rule hover:border-ink text-xs font-mono transition-all rounded-none cursor-pointer"
              title={`Switch to ${theme === 'day' ? 'Night (Dark)' : 'Day (Light)'} Mode`}
              aria-label="Day and Night Theme Conversion"
            >
              <span className="text-xs">{theme === 'day' ? '☀️' : '🌙'}</span>
              <span className="text-ink font-semibold tracking-wider text-[11px]">{theme === 'day' ? 'DAY' : 'NIGHT'}</span>
            </button>

            {/* Search Keyboard Chip */}
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-paper-sunk border border-rule text-xs font-mono text-ash hover:text-ink transition-colors rounded-none"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
              <kbd className="border border-rule px-1 py-0.2 bg-paper text-[10px]">⌘K</kbd>
            </button>

            {/* Cart Button with Monospace Item Count & Subtotal */}
            <Link
              to="/cart"
              className="flex items-center space-x-2 px-3 py-1.5 bg-paper border border-rule hover:border-ink text-xs font-mono transition-colors rounded-none"
            >
              <span className="text-ink font-semibold">CART</span>
              <span className="text-ash">·</span>
              <Numeric value={cartItemCount} format="integer" className="text-ink" />
              <span className="text-ash">·</span>
              <Numeric value={cartSubtotal} format="price" className="text-ink" />
            </Link>

            {/* User Square Avatar Dropdown */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="w-8 h-8 bg-ink text-bone font-serif text-sm flex items-center justify-center border border-rule rounded-none hover:bg-graphite transition-colors"
                  aria-label="User Account Menu"
                >
                  {userInitials}
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-paper border border-rule shadow-none z-50 p-2 text-xs font-mono">
                    <div className="px-2 py-1.5 border-b border-rule text-ash truncate">
                      {user?.email}
                    </div>
                    <Link
                      to="/orders"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="block px-2 py-1.5 text-ink hover:bg-paper-sunk"
                    >
                      MY ORDERS
                    </Link>
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                      <Link
                        to="/admin"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="block px-2 py-1.5 text-signal hover:bg-paper-sunk font-semibold"
                      >
                        ADMIN CONTROL CENTER
                      </Link>
                    )}
                    {user?.role === 'stock_operator' && (
                      <Link
                        to="/staff"
                        onClick={() => setIsUserDropdownOpen(false)}
                        className="block px-2 py-1.5 text-signal hover:bg-paper-sunk font-semibold"
                      >
                        STAFF CONTROL CENTER
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-2 py-1.5 text-loss hover:bg-paper-sunk border-t border-rule mt-1"
                    >
                      LOGOUT
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 bg-ink text-paper text-xs font-sans font-medium uppercase tracking-wider hover:bg-graphite transition-colors rounded-none"
              >
                Log In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Command Palette Modal */}
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </>
  );
};
