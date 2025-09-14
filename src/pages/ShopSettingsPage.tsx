import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import ShopNavigation from '../components/ShopNavigation';
import Button from '../components/Button';
import { getShopById, updateShop } from '../utils/shops';
import { WooCommerceService } from '../utils/woocommerce';
import { Shop } from '../utils/types';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ShopSettingsPage() {
  const { id } = useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    type: 'WooCommerce',
    url: '',
    language: 'Français',
    collectionsSlug: 'collections',
    consumerKey: '',
    consumerSecret: '',
    wpUsername: '',
    wpPassword: '',
    openaiApiKey: ''
  });

  useEffect(() => {
    const loadShop = async () => {
      if (!id) return;
      
      try {
        const shopData = await getShopById(id);
        if (shopData) {
          setShop(shopData);
          setFormData({
            name: shopData.name,
            type: shopData.type,
            url: shopData.url,
            language: shopData.language,
            collectionsSlug: shopData.collectionsSlug,
            consumerKey: shopData.consumerKey,
            consumerSecret: shopData.consumerSecret,
            wpUsername: shopData.wpUsername,
            wpPassword: shopData.wpPassword,
            openaiApiKey: shopData.openaiApiKey || ''
          });
        }
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateShop(shop.id, formData);
      setSuccess('Boutique mise à jour avec succès');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!shop) return;
    
    setTesting(true);
    try {
      const result = await WooCommerceService.testConnection(shop.id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erreur lors du test de connexion');
    } finally {
      setTesting(false);
    }
  };

  const handleSyncData = async () => {
    if (!shop) return;
    
    setSyncing(true);
    try {
      // Sync products
      const productsResult = await WooCommerceService.syncProducts(shop.id);
      if (!productsResult.success) {
        throw new Error(productsResult.error);
      }

      // Sync collections
      const collectionsResult = await WooCommerceService.syncCollections(shop.id);
      if (!collectionsResult.success) {
        throw new Error(collectionsResult.error);
      }

      toast.success(`Synchronisation réussie! ${productsResult.count} produits et ${collectionsResult.count} collections synchronisés.`);
    } catch (error) {
      toast.error(`Erreur lors de la synchronisation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <ShopNavigation shopName={shop.name} />
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Paramètres de la boutique</h2>
                  <Button variant="danger" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-600">{success}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de la boutique
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                      Type de boutique
                    </label>
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="WooCommerce">WooCommerce</option>
                      <option value="Shopify">Shopify</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                      URL de la boutique
                    </label>
                    <input
                      type="url"
                      id="url"
                      name="url"
                      required
                      value={formData.url}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="consumerKey" className="block text-sm font-medium text-gray-700 mb-2">
                      Consumer Key
                    </label>
                    <input
                      type="text"
                      id="consumerKey"
                      name="consumerKey"
                      value={formData.consumerKey}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="consumerSecret" className="block text-sm font-medium text-gray-700 mb-2">
                      Consumer Secret
                    </label>
                    <input
                      type="password"
                      id="consumerSecret"
                      name="consumerSecret"
                      value={formData.consumerSecret}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Actions WooCommerce
                  </h3>
                  <div className="flex space-x-4 mb-6">
                    <Button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testing}
                      variant="secondary"
                    >
                      {testing ? 'Test en cours...' : 'Tester la connexion'}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSyncData}
                      disabled={syncing}
                      variant="secondary"
                    >
                      {syncing ? 'Synchronisation...' : 'Synchroniser les données'}
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}