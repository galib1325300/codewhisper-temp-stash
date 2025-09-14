import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import ShopNavigation from '../components/ShopNavigation';
import Button from '../components/Button';
import { getShopById } from '../utils/shops';
import { Shop } from '../utils/types';
import { ArrowLeft, Eye } from 'lucide-react';

export default function ShopProductDetailsPage() {
  const { id, productId } = useParams();
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
            <div className="mb-6">
              <Link
                to={`/admin/shops/${id}/products`}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour aux produits
              </Link>
              <ShopNavigation shopName={shop.name} />
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Détails du produit
                </h2>
                <p className="text-gray-600 mb-4">
                  Produit ID: {productId}
                </p>
                <div className="text-gray-400 mb-4">
                  <Eye className="w-12 h-12 mx-auto" />
                </div>
                <p className="text-gray-600">
                  Les détails du produit apparaîtront ici une fois chargés
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}