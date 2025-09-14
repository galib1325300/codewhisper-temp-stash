import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import ShopNavigation from '../components/ShopNavigation';
import Button from '../components/Button';
import { getShopById } from '../utils/shops';
import { Plus, Eye, AlertTriangle } from 'lucide-react';

export default function ShopDiagnosticsPage() {
  const { id } = useParams();
  const [shop] = useState(() => getShopById(id || ''));

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
            
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Diagnostics SEO</h2>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouveau diagnostic
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <AlertTriangle className="w-12 h-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Aucun diagnostic effectué
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Lancez votre premier diagnostic SEO pour identifier les problèmes
                  </p>
                  <Button>
                    Lancer un diagnostic
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}