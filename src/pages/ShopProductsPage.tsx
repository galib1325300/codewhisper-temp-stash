import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import ShopNavigation from '../components/ShopNavigation';
import Button from '../components/Button';
import { getShopById } from '../utils/shops';
import { WooCommerceService } from '../utils/woocommerce';
import { Shop } from '../utils/types';
import { Search, Eye, RefreshCw, Package, ExternalLink, Edit } from 'lucide-react';
import LoadingState from '../components/ui/loading-state';
import EmptyState from '../components/ui/empty-state';
import StatusBadge from '../components/ui/status-badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import BulkActionsModal from '../components/products/BulkActionsModal';

export default function ShopProductsPage() {
  const { id } = useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);

  useEffect(() => {
    const loadShop = async () => {
      if (!id) return;
      
      try {
        const shopData = await getShopById(id);
        setShop(shopData);
        
        if (shopData) {
          loadProducts(shopData.id);
        }
      } catch (error) {
        console.error('Error loading shop:', error);
        toast.error('Erreur lors du chargement de la boutique');
      } finally {
        setLoading(false);
      }
    };

    loadShop();
  }, [id]);

  const loadProducts = async (shopId: string) => {
    setProductsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setProductsLoading(false);
    }
  };

  const handleSyncProducts = async () => {
    if (!shop) return;
    
    setSyncing(true);
    try {
      const result = await WooCommerceService.syncProducts(shop.id);
      if (result.success) {
        toast.success(`${result.count} produits synchronisés avec succès`);
        loadProducts(shop.id);
      } else {
        toast.error(result.error || 'Erreur lors de la synchronisation');
      }
    } catch (error) {
      console.error('Error syncing products:', error);
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleBulkAction = (action: string, language: string, preserveInternalLinks: boolean) => {
    console.log('Executing bulk action:', { action, language, preserveInternalLinks, products: Array.from(selectedProducts) });
    toast.success(`Action "${action}" en cours pour ${selectedProducts.size} produit(s)`);
    setSelectedProducts(new Set());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState size="lg" text="Chargement des produits..." />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Boutique non trouvée</h2>
          <p className="mt-2 text-muted-foreground">La boutique que vous recherchez n'existe pas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <ShopNavigation shopName={shop.name} />
            
            <div className="card-elevated">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-lg font-semibold text-foreground">Produits</h2>
                    {selectedProducts.size > 0 && (
                      <Button 
                        onClick={() => setShowBulkModal(true)}
                        variant="primary"
                      >
                        Actions ({selectedProducts.size})
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Rechercher un produit..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-colors"
                      />
                    </div>
                    <Button 
                      onClick={handleSyncProducts}
                      disabled={syncing || !shop.consumerKey || !shop.consumerSecret}
                      variant="secondary"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      Synchroniser
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {!shop.consumerKey || !shop.consumerSecret ? (
                  <EmptyState
                    icon={Package}
                    title="Configuration requise"
                    description="Configurez vos clés API WooCommerce pour voir vos produits"
                    action={{
                      label: "Configurer maintenant",
                      onClick: () => window.location.href = `/admin/shops/${id}/settings`
                    }}
                  />
                ) : productsLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border border-border rounded-lg">
                        <div className="w-16 h-16 bg-muted loading-shimmer rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted loading-shimmer rounded w-3/4" />
                          <div className="h-3 bg-muted loading-shimmer rounded w-1/2" />
                        </div>
                        <div className="h-6 w-20 bg-muted loading-shimmer rounded" />
                      </div>
                    ))}
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="Aucun produit trouvé"
                    description={searchQuery ? "Aucun produit ne correspond à votre recherche" : "Vos produits apparaîtront ici une fois synchronisés"}
                    action={!searchQuery ? {
                      label: "Synchroniser maintenant",
                      onClick: handleSyncProducts
                    } : undefined}
                  />
                ) : (
                  <div className="space-y-4">
                    {filteredProducts.length > 0 && (
                      <div className="flex items-center space-x-2 pb-4 border-b border-border">
                        <Checkbox 
                          checked={selectedProducts.size === filteredProducts.length}
                          onCheckedChange={handleSelectAll}
                        />
                        <span className="text-sm text-muted-foreground">
                          Sélectionner tout
                        </span>
                      </div>
                    )}
                    {filteredProducts.map((product) => (
                      <div key={product.id} className="card-interactive p-4">
                        <div className="flex items-center space-x-4">
                          <Checkbox 
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={() => handleSelectProduct(product.id)}
                          />
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                            {product.images && product.images.length > 0 ? (
                              <img 
                                src={product.images[0].src} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-8 h-8 text-muted-foreground" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{product.name}</h3>
                            <p className="text-sm text-muted-foreground">{product.sku || 'Pas de SKU'}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <StatusBadge 
                                status={product.status === 'publish' ? 'success' : 'warning'}
                                variant="dot"
                              >
                                {product.status === 'publish' ? 'Publié' : 'Brouillon'}
                              </StatusBadge>
                              {product.featured && (
                                <StatusBadge status="info" variant="outline">
                                  En vedette
                                </StatusBadge>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-bold text-foreground">
                              {product.price ? `${product.price}€` : 'Prix non défini'}
                            </p>
                            {product.regular_price && product.sale_price && (
                              <p className="text-sm text-muted-foreground line-through">
                                {product.regular_price}€
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Stock: {product.stock_quantity || 'N/A'}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button variant="secondary">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="secondary">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      <BulkActionsModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        selectedCount={selectedProducts.size}
        onExecute={handleBulkAction}
      />
    </div>
  );
}