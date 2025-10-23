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
import ShopDiagnosticDetailPage from './pages/ShopDiagnosticDetailPage';
import IssueDetailPage from './pages/IssueDetailPage';
import ShopSettingsPage from './pages/ShopSettingsPage';
import ShopScrapingPage from './pages/ShopScrapingPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SEOOptimizationPage from './pages/SEOOptimizationPage';
import MultiStoreOverview from './pages/MultiStoreOverview';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/scraping" element={<ProtectedRoute><ScrapingPage /></ProtectedRoute>} />
            <Route path="/admin/files" element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />
            <Route path="/admin/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
            <Route path="/admin/subscribe" element={<ProtectedRoute><SubscriptionPage /></ProtectedRoute>} />
            <Route path="/admin/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="/admin/multi-store" element={<ProtectedRoute><MultiStoreOverview /></ProtectedRoute>} />
            <Route path="/admin/team" element={<ProtectedRoute><div>Team Management Coming Soon</div></ProtectedRoute>} />
            
            {/* Shop Routes */}
            <Route path="/admin/shops/new" element={<ProtectedRoute><NewShopPage /></ProtectedRoute>} />
            <Route path="/admin/shops/:id" element={<ProtectedRoute><ShopDashboardPage /></ProtectedRoute>} />
            <Route path="/admin/shops/:id/products" element={<ProtectedRoute><ShopProductsPage /></ProtectedRoute>} />
            <Route path="/admin/shops/:id/products/:productId" element={<ProtectedRoute><ShopProductDetailsPage /></ProtectedRoute>} />
            <Route path="/admin/shops/:id/collections" element={<ProtectedRoute><ShopCollectionsPage /></ProtectedRoute>} />
            <Route path="/admin/shops/:id/blog" element={<ProtectedRoute><ShopBlogPage /></ProtectedRoute>} />
            <Route path="/admin/shops/:id/diagnostics" element={<ProtectedRoute><ShopDiagnosticsPage /></ProtectedRoute>} />
            <Route path="/admin/shops/:id/diagnostics/:diagnosticId" element={<ProtectedRoute><ShopDiagnosticDetailPage /></ProtectedRoute>} />
            <Route path="/admin/shops/:id/diagnostics/:diagnosticId/issue/:issueKey" element={<ProtectedRoute><IssueDetailPage /></ProtectedRoute>} />
            <Route path="/admin/shops/:id/diagnostics/:diagnosticId/issues/:issueIndex" element={<ProtectedRoute><IssueDetailPage /></ProtectedRoute>} />
            <Route path="/admin/shops/:id/settings" element={<ProtectedRoute><ShopSettingsPage /></ProtectedRoute>} />
            <Route path="/admin/shops/:id/scraping" element={<ProtectedRoute><ShopScrapingPage /></ProtectedRoute>} />
            <Route path="/admin/shops/:id/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/admin/shops/:id/seo-optimization" element={<ProtectedRoute><SEOOptimizationPage /></ProtectedRoute>} />
            <Route path="/admin/shops/:id/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        <Toaster position="top-right" />
      </AuthProvider>
    </ErrorBoundary>
  );
}