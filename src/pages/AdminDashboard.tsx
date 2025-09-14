import React, { useState } from 'react';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import { LayoutDashboard, Search, FileText, Building2, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import Button from '../components/Button';
import { getShops } from '../utils/shops';
import { DashboardStats } from '../utils/types';

function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Icon className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className="text-3xl font-bold text-indigo-600">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats] = useState<DashboardStats>({
    products: 0,
    collections: 0,
    blogPosts: 0,
    unpublishedChanges: 0,
    revenue: '0.00€',
    orders: 0,
    averageCart: '0.00€',
    customers: 0,
    productsSold: 0,
    refunds: 0,
    countries: []
  });
  const shops = getShops();

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Vue d'ensemble de vos boutiques</p>
            </div>

            {shops.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Aucune boutique connectée
                </h3>
                <p className="text-gray-600 mb-6">
                  Connectez votre première boutique pour commencer à générer du contenu SEO
                </p>
                <Button onClick={() => window.location.href = '/admin/shops/new'}>
                  Connecter une boutique
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <StatCard title="Produits" value={stats.products} icon={Search} />
                  <StatCard title="Collections" value={stats.collections} icon={LayoutDashboard} />
                  <StatCard title="Articles" value={stats.blogPosts} icon={BookOpen} />
                  <StatCard title="Non publiés" value={stats.unpublishedChanges} icon={AlertCircle} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Mes Boutiques</h3>
                      <div className="space-y-3">
                        {shops.map((shop) => (
                          <div key={shop.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div>
                              <h4 className="font-medium text-gray-900">{shop.name}</h4>
                              <p className="text-sm text-gray-500">{shop.url}</p>
                            </div>
                            <Button 
                              variant="secondary" 
                              size="sm"
                              onClick={() => window.location.href = `/admin/shops/${shop.id}`}
                            >
                              Gérer
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Crédits restants</h3>
                      <div className="text-3xl font-bold text-indigo-600 mb-2">2550</div>
                      <p className="text-sm text-gray-600">Sur votre plan Pro</p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
                      <div className="space-y-2">
                        <Button variant="secondary" className="w-full justify-start">
                          <FileText className="w-4 h-4 mr-2" />
                          Traiter un CSV
                        </Button>
                        <Button variant="secondary" className="w-full justify-start">
                          <Search className="w-4 h-4 mr-2" />
                          Scraper une boutique
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}