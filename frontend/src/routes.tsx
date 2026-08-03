import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { useAuth } from './context/AuthContext';

import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { WishlistPage } from './pages/WishlistPage';
import { AdminPage } from './pages/AdminPage';
import { VendorPortalPage } from './pages/VendorPortalPage';
import { SupportPortalPage } from './pages/SupportPortalPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { NotFoundPage } from './pages/NotFoundPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const allowedRoles = ['admin', 'manager'];
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/products" replace />;
  }

  return <>{children}</>;
};

const StaffRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user || user.role !== 'stock_operator') {
    return <Navigate to="/products" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Default route redirects to catalog */}
        <Route index element={<Navigate to="/products" replace />} />
        
        {/* Public Catalog Routes */}
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />

        {/* Public Auth Routes */}
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />

        {/* Cart & Checkout (supports guest & user flows) */}
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />

        {/* User Protected Routes */}
        <Route
          path="orders"
          element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="wishlist"
          element={
            <ProtectedRoute>
              <WishlistPage />
            </ProtectedRoute>
          }
        />

        {/* Vendor Merchant Portal Route */}
        <Route
          path="vendor"
          element={
            <ProtectedRoute>
              <VendorPortalPage />
            </ProtectedRoute>
          }
        />

        {/* Customer Support & AI Desk Route */}
        <Route
          path="support"
          element={
            <ProtectedRoute>
              <SupportPortalPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Portal Route (Role Gated) */}
        <Route
          path="admin/*"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />

        <Route
          path="staff/*"
          element={
            <StaffRoute>
              <AdminPage />
            </StaffRoute>
          }
        />
        <Route
          path="staff"
          element={
            <StaffRoute>
              <AdminPage />
            </StaffRoute>
          }
        />

        {/* 404 Catch all */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
