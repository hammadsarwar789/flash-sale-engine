import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Menu, X } from 'lucide-react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      <header className="h-[72px] bg-paper border-b border-rule sticky top-0 z-40 flex items-center px-3 sm:px-6 lg:px-8">
        <div className="max-w-[1440px] w-full mx-auto flex items-center justify-between gap-3 sm:gap-6">

          {/* Brand Wordmark & Desktop Navigation */}
          <div className="flex items-center space-x-4 sm:space-x-8">
            <Wordmark size="md" />

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6 text-sm font-sans">
              <Link
                to="/products"
                className={`relative py-5 transition-colors font-medium ${isActive('/products') ? 'text-ink' : 'text-graphite hover:text-ink'
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
                  className={`relative py-5 transition-colors font-medium ${isActive('/orders') ? 'text-ink' : 'text-graphite hover:text-ink'
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
                className={`relative py-5 transition-colors font-medium ${isActive('/wishlist') ? 'text-ink' : 'text-graphite hover:text-ink'
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
                  className={`relative py-5 transition-colors font-mono text-xs uppercase tracking-wider ${isActive('/vendor') ? 'text-signal font-semibold' : 'text-ash hover:text-ink'
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
                  className={`relative py-5 transition-colors font-mono text-xs uppercase tracking-wider ${isActive('/support') ? 'text-signal font-semibold' : 'text-ash hover:text-ink'
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
                  className={`relative py-5 transition-colors font-mono text-xs uppercase tracking-wider ${isActive('/admin') ? 'text-signal font-semibold' : 'text-ash hover:text-ink'
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
                  className={`relative py-5 transition-colors font-mono text-xs uppercase tracking-wider ${isActive('/staff') ? 'text-signal font-semibold' : 'text-ash hover:text-ink'
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
          <div className="flex items-center space-x-1.5 sm:space-x-3 flex-shrink-0">

            {/* Day / Night Theme Conversion Toggle Button */}
            <button
              onClick={toggleTheme}
              className="w-7 h-7 sm:w-auto sm:px-2.5 sm:py-1.5 flex items-center justify-center space-x-1 bg-paper border border-rule hover:border-ink text-xs font-mono transition-all rounded-none cursor-pointer"
              title={`Switch to ${theme === 'day' ? 'Night (Dark)' : 'Day (Light)'} Mode`}
              aria-label="Day and Night Theme Conversion"
            >
              <span className="text-xs">{theme === 'day' ? '☀️' : '🌙'}</span>
              <span className="text-ink font-semibold tracking-wider text-[10px] sm:text-[11px] hidden sm:inline">{theme === 'day' ? 'DAY' : 'NIGHT'}</span>
            </button>

            {/* Search Desktop Keyboard Chip */}
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-paper-sunk border border-rule text-xs font-mono text-ash hover:text-ink transition-colors rounded-none"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
              <kbd className="border border-rule px-1 py-0.2 bg-paper text-[10px]">⌘K</kbd>
            </button>

            {/* Mobile Search Icon Button */}
            <button
              onClick={() => setIsPaletteOpen(true)}
              className="w-7 h-7 flex sm:hidden items-center justify-center bg-paper-sunk border border-rule text-ash hover:text-ink transition-colors rounded-none"
              aria-label="Search"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Cart Button with Monospace Item Count & Subtotal */}
            <Link
              to="/cart"
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-paper border border-rule hover:border-ink text-xs font-mono transition-colors rounded-none whitespace-nowrap"
            >
              <span className="text-ink font-semibold text-[11px] sm:text-xs">CART</span>
              <span className="text-ash">·</span>
              <Numeric value={cartItemCount} format="integer" className="text-ink text-[11px] sm:text-xs font-semibold" />
              <span className="hidden md:inline text-ash">·</span>
              <span className="hidden md:inline">
                <Numeric value={cartSubtotal} format="price" className="text-ink" />
              </span>
            </Link>

            {/* User Square Avatar Dropdown (Shown on sm+; mobile menu contains user profile & actions) */}
            {isAuthenticated ? (
              <div className="relative hidden sm:block">
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
                className="hidden sm:inline-block px-3 py-1.5 bg-ink text-paper text-xs font-sans font-medium uppercase tracking-wider hover:bg-graphite transition-colors rounded-none"
              >
                Log In
              </Link>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-7 h-7 flex md:hidden items-center justify-center bg-paper border border-rule text-ink hover:bg-paper-sunk transition-colors cursor-pointer"
              aria-label={isMobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-paper border-b border-rule font-mono text-xs z-30 sticky top-[72px] px-4 py-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Link
            to="/products"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block py-2 px-3 border border-transparent ${isActive('/products') ? 'bg-paper-sunk font-semibold text-ink border-rule' : 'text-graphite hover:text-ink'
              }`}
          >
            CATALOG FLOOR
          </Link>

          <Link
            to="/wishlist"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`block py-2 px-3 border border-transparent ${isActive('/wishlist') ? 'bg-paper-sunk font-semibold text-ink border-rule' : 'text-graphite hover:text-ink'
              }`}
          >
            WISHLIST {wishlistCount > 0 && <span className="text-ash">({wishlistCount})</span>}
          </Link>

          {isAuthenticated && (
            <Link
              to="/orders"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block py-2 px-3 border border-transparent ${isActive('/orders') ? 'bg-paper-sunk font-semibold text-ink border-rule' : 'text-graphite hover:text-ink'
                }`}
            >
              MY ORDERS
            </Link>
          )}

          {isAuthenticated && (
            <Link
              to="/vendor"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block py-2 px-3 border border-transparent text-signal ${isActive('/vendor') ? 'bg-paper-sunk font-semibold border-signal' : 'hover:underline'
                }`}
            >
              [ VENDOR DESK ]
            </Link>
          )}

          {isAuthenticated && (
            <Link
              to="/support"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block py-2 px-3 border border-transparent text-signal ${isActive('/support') ? 'bg-paper-sunk font-semibold border-signal' : 'hover:underline'
                }`}
            >
              [ SUPPORT DESK ]
            </Link>
          )}

          {(user?.role === 'admin' || user?.role === 'manager') && (
            <Link
              to="/admin"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block py-2 px-3 border border-transparent text-signal font-semibold ${isActive('/admin') ? 'bg-paper-sunk border-signal' : 'hover:underline'
                }`}
            >
              [ ADMIN CONTROL CENTER ]
            </Link>
          )}

          {user?.role === 'stock_operator' && (
            <Link
              to="/staff"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block py-2 px-3 border border-transparent text-signal font-semibold ${isActive('/staff') ? 'bg-paper-sunk border-signal' : 'hover:underline'
                }`}
            >
              [ STAFF CONTROL CENTER ]
            </Link>
          )}

          {isAuthenticated ? (
            <div className="pt-2 border-t border-rule flex items-center justify-between px-3 text-ash">
              <span className="truncate max-w-[200px]">{user?.email}</span>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  logout();
                }}
                className="text-loss hover:underline"
              >
                LOGOUT
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-rule">
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-center py-2 bg-ink text-paper font-sans font-medium uppercase tracking-wider"
              >
                LOG IN
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Command Palette Modal */}
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </>
  );
};

