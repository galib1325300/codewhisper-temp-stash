import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import ShopNavigation from '../components/ShopNavigation';
import Button from '../components/Button';
import { getShopById, updateShop } from '../utils/shops';
import { WooCommerceService } from '../utils/woocommerce';
import { Shop } from '../utils/types';
import { Trash2, Settings, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
    openaiApiKey: '',
    analyticsEnabled: false,
    jetpackAccessToken: '',
    shopifyAccessToken: ''
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
            openaiApiKey: shopData.openaiApiKey || '',
            analyticsEnabled: shopData.analyticsEnabled,
            jetpackAccessToken: shopData.jetpackAccessToken || '',
            shopifyAccessToken: shopData.shopifyAccessToken || ''
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
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
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

  const handleTestAnalytics = async () => {
    if (!shop) return;
    
    setTesting(true);
    try {
      let functionName = '';
      
      if (formData.type.toLowerCase() === 'shopify') {
        functionName = 'get-shopify-analytics';
        if (!formData.shopifyAccessToken) {
          throw new Error('Token Shopify requis');
        }
      } else {
        // For WordPress/WooCommerce, try Jetpack first, then basic API
        if (shop.jetpackAccessToken) {
          functionName = 'get-wordpress-jetpack-analytics';
        } else if (shop.consumerKey && shop.consumerSecret) {
          functionName = 'get-wordpress-basic-analytics';
        } else {
          throw new Error('Credentials WooCommerce ou token Jetpack requis');
        }
      }
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { shopId: shop.id, timeRange: '7days' }
      });

      if (error) {
        throw error;
      }

      const isBasicAPI = functionName.includes('basic');
      const isJetpack = functionName.includes('jetpack');
      toast.success(`Test de connexion Analytics réussi ${isJetpack ? '(Jetpack - données réelles)' : isBasicAPI ? '(API WordPress de base - revenus réels, trafic estimé)' : '(Jetpack)'}`);
    } catch (error: any) {
      if (error.message?.includes('not configured') || error.message?.includes('access token')) {
        toast.error('Token d\'accès non configuré ou invalide');
      } else {
        toast.error(`Erreur: ${error.message || 'Erreur lors du test de connexion Analytics'}`);
      }
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Configuration Analytics
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="analyticsEnabled"
                        name="analyticsEnabled"
                        checked={formData.analyticsEnabled}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="analyticsEnabled" className="text-sm font-medium text-gray-700">
                        Activer les analytics SEO
                      </label>
                    </div>

                    {formData.analyticsEnabled && (
                      <div className="space-y-4 pl-7 border-l-2 border-gray-200">
                        {formData.type.toLowerCase() === 'shopify' ? (
                          <div>
                            <label htmlFor="shopifyAccessToken" className="block text-sm font-medium text-gray-700 mb-2">
                              Shopify Admin API Access Token
                            </label>
                            <input
                              type="password"
                              id="shopifyAccessToken"
                              name="shopifyAccessToken"
                              value={formData.shopifyAccessToken}
                              onChange={handleInputChange}
                              placeholder="shpat_..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Trouvez votre token dans Admin Shopify → Apps → Gérer les apps privées
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <h4 className="font-medium text-blue-900 mb-2">Options Analytics WordPress</h4>
                              <div className="text-sm text-blue-800 space-y-1">
                                 <p><strong>Option 1 (Recommandée) :</strong> Configurez Jetpack pour analytics avancées</p>
                                <p><strong>Option 2 :</strong> Utilisez vos credentials WooCommerce existants</p>
                              </div>
                            </div>

                            <div>
                              <label htmlFor="jetpackAccessToken" className="block text-sm font-medium text-gray-700 mb-2">
                                Token d'accès Jetpack (optionnel)
                              </label>
                              <input
                                type="password"
                                id="jetpackAccessToken"
                                name="jetpackAccessToken"
                                value={formData.jetpackAccessToken}
                                onChange={handleInputChange}
                                placeholder="wp_... (optionnel)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                               <p className="mt-1 text-xs text-gray-500">
                                Si configuré, utilise Jetpack pour des données réelles. Sinon, utilise automatiquement vos credentials WooCommerce.
                              </p>
                            </div>

                            {formData.jetpackAccessToken ? (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-800">
                                  ✅ Analytics Jetpack configurées - données réelles disponibles
                                </p>
                              </div>
                            ) : (formData.consumerKey && formData.consumerSecret) && (
                              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                  ⚠️ Analytics de base disponibles avec WooCommerce - revenus réels, trafic estimé
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex space-x-3">
                          <Button
                            type="button"
                            onClick={handleTestAnalytics}
                            disabled={testing}
                            variant="secondary"
                            size="sm"
                          >
                            {testing ? 'Test en cours...' : 'Tester la connexion Analytics'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Connexion WordPress (Avancé)
                  </h3>
                  
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">
                      🔐 Pourquoi configurer un mot de passe d'application WordPress ?
                    </h4>
                    <div className="text-sm text-blue-800 space-y-2">
                      <p>
                        Les <strong>credentials WooCommerce</strong> (Consumer Key/Secret ci-dessus) permettent 
                        de gérer les produits et commandes, mais <strong>ne donnent pas accès</strong> à :
                      </p>
                      <ul className="list-disc ml-6 space-y-1">
                        <li><strong>Textes alternatifs (ALT) des images</strong> - nécessite l'API WordPress Media</li>
                        <li><strong>Articles de blog</strong> - nécessite l'API WordPress Posts</li>
                        <li><strong>Modifications avancées du contenu</strong> (hors produits WooCommerce)</li>
                      </ul>
                      <p className="mt-3">
                        Pour activer ces fonctionnalités, vous devez générer un <strong>mot de passe d'application</strong> 
                        depuis votre tableau de bord WordPress.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="wpUsername" className="block text-sm font-medium text-gray-700 mb-2">
                        Nom d'utilisateur WordPress
                      </label>
                      <input
                        type="text"
                        id="wpUsername"
                        name="wpUsername"
                        value={formData.wpUsername}
                        onChange={handleInputChange}
                        placeholder="admin"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Votre nom d'utilisateur WordPress (généralement "admin" ou votre email)
                      </p>
                    </div>

                    <div>
                      <label htmlFor="wpPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Mot de passe d'application WordPress
                      </label>
                      <input
                        type="password"
                        id="wpPassword"
                        name="wpPassword"
                        value={formData.wpPassword}
                        onChange={handleInputChange}
                        placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Format attendu : <code className="bg-gray-100 px-1 rounded">xxxx xxxx xxxx xxxx xxxx xxxx</code> 
                        (24 caractères en 6 groupes de 4)
                      </p>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <h4 className="font-medium text-amber-900 mb-2 flex items-center">
                        <Info className="w-4 h-4 mr-2" />
                        Comment générer un mot de passe d'application ?
                      </h4>
                      <ol className="list-decimal ml-6 text-sm text-amber-800 space-y-2">
                        <li>
                          Connectez-vous à votre tableau de bord WordPress : 
                          <code className="bg-white px-2 py-1 rounded ml-2">{formData.url}/wp-admin</code>
                        </li>
                        <li>
                          Allez dans <strong>Utilisateurs → Profil</strong>
                        </li>
                        <li>
                          Descendez jusqu'à la section <strong>"Mots de passe d'application"</strong>
                        </li>
                        <li>
                          Entrez un nom (ex: "SEO App") et cliquez sur <strong>"Ajouter"</strong>
                        </li>
                        <li>
                          Copiez le mot de passe généré (format: <code>xxxx xxxx xxxx...</code>) 
                          et collez-le ci-dessus
                        </li>
                      </ol>
                      <p className="mt-3 text-sm text-amber-700">
                        ⚠️ <strong>Important</strong> : Ce mot de passe ne s'affiche qu'une seule fois. 
                        Conservez-le en lieu sûr !
                      </p>
                    </div>

                    {formData.wpUsername && formData.wpPassword && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          ✅ Credentials WordPress configurés - fonctionnalités avancées activées 
                          (ALT images, blog, etc.)
                        </p>
                      </div>
                    )}

                    {(!formData.wpUsername || !formData.wpPassword) && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          ⚠️ Credentials WordPress non configurés - fonctionnalités limitées aux produits WooCommerce
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Actions WooCommerce
                  </h3>
                  <div className="flex space-x-4 mb-6">
                    <Button
                      type="button"
                      onClick={handleTestAnalytics}
                      disabled={testing}
                      variant="secondary"
                    >
                      {testing ? 'Test en cours...' : 'Tester la connexion Analytics'}
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