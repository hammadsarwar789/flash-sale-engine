import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Heart, Search, Flame, LogOut, Package, LogIn, Menu, X, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../hooks/useCart';
import { useWishlist } from '../../hooks/useWishlist';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { cart } = useCart();
  const { wishlistItems } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const cartItemCount = cart?.item_count || 0;
  const wishlistCount = wishlistItems?.length || 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/products');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo */}
          <Link to="/products" className="flex items-center space-x-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-200">
              <Flame className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent tracking-tight">
                FLASH<span className="text-cyan-400">SALE</span>
              </span>
              <span className="text-[10px] text-cyan-400/80 tracking-widest font-semibold uppercase -mt-1">
                ENGINE V1
              </span>
            </div>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-md mx-4 relative">
            <input
              type="text"
              placeholder="Search flash deals, products, SKUs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/90 text-sm text-slate-100 placeholder-slate-400 rounded-full pl-10 pr-4 py-2 border border-slate-800 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </form>

          {/* Desktop Nav Actions */}
          <div className="hidden md:flex items-center space-x-5">
            <Link
              to="/products"
              className={`text-sm font-medium transition-colors ${
                isActive('/products') ? 'text-cyan-400' : 'text-slate-300 hover:text-white'
              }`}
            >
              Catalog
            </Link>

            {isAuthenticated && (
              <Link
                to="/orders"
                className={`text-sm font-medium transition-colors flex items-center space-x-1 ${
                  isActive('/orders') ? 'text-cyan-400' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>My Orders</span>
              </Link>
            )}

            {/* Admin Portal Link */}
            <Link
              to="/admin"
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center space-x-1 ${
                isActive('/admin')
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              <span>Admin Portal</span>
            </Link>

            {/* Wishlist Button */}
            <Link
              to="/wishlist"
              className="relative p-2 text-slate-300 hover:text-rose-400 transition-colors"
              title="Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-rose-500 rounded-full animate-scale-in">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Button */}
            <Link
              to="/cart"
              className="relative flex items-center space-x-2 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-slate-100 px-3.5 py-2 rounded-xl border border-slate-700/60 shadow-md transition-all group"
            >
              <ShoppingBag className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold">Cart</span>
              {cartItemCount > 0 && (
                <span className="bg-cyan-500 text-slate-950 font-extrabold text-xs px-2 py-0.5 rounded-full ml-1">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* User Dropdown / Auth CTA */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 p-2 rounded-xl text-sm font-medium text-slate-200 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    {user?.full_name ? user.full_name[0].toUpperCase() : user?.email[0].toUpperCase()}
                  </div>
                  <span className="max-w-[100px] truncate">{user?.full_name || user?.email}</span>
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-slate-800">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
                    </div>
                    <Link
                      to="/orders"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <Package className="w-4 h-4 text-cyan-400" />
                      <span>Order History</span>
                    </Link>
                    <Link
                      to="/wishlist"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <Heart className="w-4 h-4 text-rose-400" />
                      <span>Saved Items</span>
                    </Link>
                    <Link
                      to="/admin"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-cyan-400 hover:bg-slate-800"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>Admin Control</span>
                    </Link>
                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left flex items-center space-x-2 px-4 py-2 text-sm text-rose-400 hover:bg-slate-800"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center space-x-3">
            <Link to="/cart" className="relative p-2 text-slate-200">
              <ShoppingBag className="w-6 h-6 text-cyan-400" />
              {cartItemCount > 0 && (
                <span className="absolute top-0 right-0 bg-cyan-500 text-slate-950 font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-3 pb-6 space-y-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 text-sm text-slate-100 placeholder-slate-400 rounded-lg pl-9 pr-3 py-2 border border-slate-700"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </form>

          <div className="flex flex-col space-y-2 pt-2">
            <Link
              to="/products"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800"
            >
              Catalog
            </Link>
            <Link
              to="/admin"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-cyan-400 hover:bg-slate-800 flex items-center space-x-2"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Admin Portal</span>
            </Link>
            <Link
              to="/wishlist"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800 flex justify-between"
            >
              <span>Wishlist</span>
              {wishlistCount > 0 && <span className="text-xs bg-rose-500 px-2 py-0.5 rounded-full text-white">{wishlistCount}</span>}
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  to="/orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-800"
                >
                  My Orders
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  className="text-left px-3 py-2 rounded-lg text-rose-400 hover:bg-slate-800"
                >
                  Logout ({user?.email})
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-center"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
