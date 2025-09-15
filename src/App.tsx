import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { Toaster } from 'sonner';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import AdminDashboard from './pages/AdminDashboard';
import ScrapingPage from './pages/ScrapingPage';
import FilesPage from './pages/FilesPage';
import AccountPage from './pages/AccountPage';
import SubscriptionPage from './pages/SubscriptionPage';
import HistoryPage from './pages/HistoryPage';
import NewShopPage from './pages/NewShopPage';
import ShopDashboardPage from './pages/ShopDashboardPage';
import ShopProductsPage from './pages/ShopProductsPage';
import ShopProductDetailsPage from './pages/ShopProductDetailsPage';
import ShopCollectionsPage from './pages/ShopCollectionsPage';
import ShopBlogPage from './pages/ShopBlogPage';
import ShopDiagnosticsPage from './pages/ShopDiagnosticsPage';
import ShopSettingsPage from './pages/ShopSettingsPage';
import ShopScrapingPage from './pages/ShopScrapingPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SEOOptimizationPage from './pages/SEOOptimizationPage';
import MultiStoreOverview from './pages/MultiStoreOverview';
import AdminProtectedRoute from './components/AdminProtectedRoute';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
            <Route path="/admin/scraping" element={<AdminProtectedRoute><ScrapingPage /></AdminProtectedRoute>} />
            <Route path="/admin/files" element={<AdminProtectedRoute><FilesPage /></AdminProtectedRoute>} />
            <Route path="/admin/account" element={<AdminProtectedRoute><AccountPage /></AdminProtectedRoute>} />
            <Route path="/admin/subscribe" element={<AdminProtectedRoute><SubscriptionPage /></AdminProtectedRoute>} />
            <Route path="/admin/history" element={<AdminProtectedRoute><HistoryPage /></AdminProtectedRoute>} />
            <Route path="/admin/multi-store" element={<AdminProtectedRoute><MultiStoreOverview /></AdminProtectedRoute>} />
            <Route path="/admin/team" element={<AdminProtectedRoute><div>Team Management Coming Soon</div></AdminProtectedRoute>} />
            
            {/* Shop Routes */}
            <Route path="/admin/shops/new" element={<AdminProtectedRoute><NewShopPage /></AdminProtectedRoute>} />
            <Route path="/admin/shops/:id" element={<AdminProtectedRoute><ShopDashboardPage /></AdminProtectedRoute>} />
            <Route path="/admin/shops/:id/products" element={<AdminProtectedRoute><ShopProductsPage /></AdminProtectedRoute>} />
            <Route path="/admin/shops/:id/products/:productId" element={<AdminProtectedRoute><ShopProductDetailsPage /></AdminProtectedRoute>} />
            <Route path="/admin/shops/:id/collections" element={<AdminProtectedRoute><ShopCollectionsPage /></AdminProtectedRoute>} />
            <Route path="/admin/shops/:id/blog" element={<AdminProtectedRoute><ShopBlogPage /></AdminProtectedRoute>} />
            <Route path="/admin/shops/:id/diagnostics" element={<AdminProtectedRoute><ShopDiagnosticsPage /></AdminProtectedRoute>} />
            <Route path="/admin/shops/:id/settings" element={<AdminProtectedRoute><ShopSettingsPage /></AdminProtectedRoute>} />
            <Route path="/admin/shops/:id/scraping" element={<AdminProtectedRoute><ShopScrapingPage /></AdminProtectedRoute>} />
            <Route path="/admin/shops/:id/analytics" element={<AdminProtectedRoute><AnalyticsPage /></AdminProtectedRoute>} />
            <Route path="/admin/shops/:id/seo-optimization" element={<AdminProtectedRoute><SEOOptimizationPage /></AdminProtectedRoute>} />
            <Route path="/admin/shops/:id/history" element={<AdminProtectedRoute><HistoryPage /></AdminProtectedRoute>} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        <Toaster position="top-right" />
      </AuthProvider>
    </ErrorBoundary>
  );
}