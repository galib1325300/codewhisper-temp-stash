import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import ShopNavigation from '../components/ShopNavigation';
import Button from '../components/Button';
import { getShopById } from '../utils/shops';
import { Shop } from '../utils/types';
import { Settings, AlertTriangle } from 'lucide-react';

export default function ShopDashboardPage() {
  const { id } = useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadShop = async () => {
      if (!id) return;
      
      try {
        const shopData = await getShopById(id);
        setShop(shopData);
      } catch (error) {
        console.error('Error loading shop:', error);
      } finally {
        setLoading(false);
      }
    };

    loadShop();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Boutique non trouvée</h2>
          <p className="mt-2 text-gray-600">La boutique que vous recherchez n'existe pas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <ShopNavigation shopName={shop.name} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Produits</h3>
                <p className="text-3xl font-bold text-indigo-600">0</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Collections</h3>
                <p className="text-3xl font-bold text-indigo-600">0</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Articles</h3>
                <p className="text-3xl font-bold text-indigo-600">0</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-500">Commandes</h3>
                <p className="text-3xl font-bold text-indigo-600">0</p>
              </div>
            </div>

            {(!shop.consumerKey || !shop.consumerSecret) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">Configuration requise</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Les clés API WooCommerce ne sont pas configurées pour cette boutique.
                    </p>
                    <Link 
                      to={`/admin/shops/${id}/settings`}
                      className="inline-flex items-center mt-2 text-sm text-yellow-800 hover:text-yellow-900"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Configurer maintenant
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
                <div className="space-y-3">
                  <Link
                    to={`/admin/shops/${id}/products`}
                    className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h4 className="font-medium text-gray-900">Gérer les produits</h4>
                    <p className="text-sm text-gray-600">Voir et modifier vos fiches produits</p>
                  </Link>
                  <Link
                    to={`/admin/shops/${id}/blog`}
                    className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h4 className="font-medium text-gray-900">Articles de blog</h4>
                    <p className="text-sm text-gray-600">Générer du contenu pour votre blog</p>
                  </Link>
                  <Link
                    to={`/admin/shops/${id}/diagnostics`}
                    className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h4 className="font-medium text-gray-900">Diagnostics SEO</h4>
                    <p className="text-sm text-gray-600">Analyser et corriger les problèmes</p>
                  </Link>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations boutique</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type :</span>
                    <span className="font-medium">{shop.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">URL :</span>
                    <a 
                      href={shop.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-700 truncate max-w-xs"
                    >
                      {shop.url}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Langue :</span>
                    <span className="font-medium">{shop.language}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Statut :</span>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Connectée
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}