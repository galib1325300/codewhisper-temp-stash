import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import ShopNavigation from '../components/ShopNavigation';
import DiagnosticsList from '../components/diagnostics/DiagnosticsList';
import { getShopById } from '../utils/shops';
import { Shop } from '../utils/types';
import { Settings, Database } from 'lucide-react';
import { Button } from '../components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ShopDiagnosticsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

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

  const isShopConnected = () => {
    if (!shop) return false;
    return !!(shop.consumerKey && shop.consumerSecret);
  };

  const handleConfigureConnection = () => {
    if (shop) {
      navigate(`/admin/shops/${shop.id}/settings`);
    }
  };

  const handleSyncCollections = async () => {
    if (!shop) return;
    
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-woocommerce-collections', {
        body: { shopId: shop.id }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`${data.synced} collections synchronisées avec succès !`);
        if (data.errors > 0) {
          toast.warning(`${data.errors} erreurs lors de la synchronisation`);
        }
      } else {
        toast.error(data?.error || 'Erreur lors de la synchronisation');
      }
    } catch (error) {
      console.error('Error syncing collections:', error);
      toast.error('Erreur lors de la synchronisation des collections');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
            
            <div className="bg-card rounded-lg shadow-sm border border-border">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Diagnostics SEO</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Analysez votre boutique pour identifier les problèmes SEO et améliorer votre référencement
                  </p>
                </div>
                {isShopConnected() && (
                  <Button 
                    onClick={handleSyncCollections}
                    disabled={syncing}
                    variant="outline"
                    size="sm"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    {syncing ? 'Synchronisation...' : 'Sync Collections'}
                  </Button>
                )}
              </div>

              <div className="p-6">
                {!isShopConnected() ? (
                  <div className="text-center py-12">
                    <div className="text-amber-500 mb-4">
                      <Settings className="w-12 h-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Boutique non connectée
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Vous devez connecter votre boutique WooCommerce pour effectuer des diagnostics SEO
                    </p>
                    <Button onClick={handleConfigureConnection}>
                      <Settings className="w-4 h-4 mr-2" />
                      Configurer la connexion
                    </Button>
                  </div>
                ) : (
                  <DiagnosticsList shopId={shop.id} />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}