import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import ShopNavigation from '../components/ShopNavigation';
import Button from '../components/Button';
import { getShopById } from '../utils/shops';
import { WooCommerceService } from '../utils/woocommerce';
import { Shop, DashboardStats } from '../utils/types';
import { Settings, AlertTriangle, Package, FolderOpen, FileText, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import LoadingState from '../components/ui/loading-state';
import StatCard from '../components/ui/stat-card';
import StatusBadge from '../components/ui/status-badge';
import { toast } from 'sonner';

export default function ShopDashboardPage() {
  const { id } = useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
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

  useEffect(() => {
    const loadShop = async () => {
      if (!id) return;
      
      try {
        const shopData = await getShopById(id);
        setShop(shopData);
        
        if (shopData) {
          loadStats(shopData.id);
        }
      } catch (error) {
        console.error('Error loading shop:', error);
      } finally {
        setLoading(false);
      }
    };

    loadShop();
  }, [id]);

  const loadStats = async (shopId: string) => {
    setStatsLoading(true);
    try {
      const result = await WooCommerceService.getDashboardStats(shopId);
      if (result.success && result.stats) {
        setStats(prevStats => ({
          ...prevStats,
          products: result.stats!.products,
          collections: result.stats!.collections,
          orders: result.stats!.orders,
          revenue: result.stats!.revenue,
          customers: result.stats!.customers,
        }));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingState size="lg" text="Chargement du tableau de bord..." />
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Produits"
                value={stats.products}
                icon={Package}
                loading={statsLoading}
                variant="gradient"
              />
              <StatCard
                title="Collections"
                value={stats.collections}
                icon={FolderOpen}
                loading={statsLoading}
                variant="gradient"
              />
              <StatCard
                title="Articles"
                value={stats.blogPosts}
                icon={FileText}
                variant="gradient"
              />
              <StatCard
                title="Commandes"
                value={stats.orders}
                icon={ShoppingCart}
                loading={statsLoading}
                variant="gradient"
                trend={{ value: 12, label: "ce mois" }}
              />
            </div>

            {(!shop.consumerKey || !shop.consumerSecret) && (
              <div className="bg-warning-light border border-warning/20 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-warning mt-0.5 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-warning">Configuration requise</h3>
                    <p className="text-sm text-warning/80 mt-1">
                      Les clés API WooCommerce ne sont pas configurées pour cette boutique.
                    </p>
                    <Link 
                      to={`/admin/shops/${id}/settings`}
                      className="inline-flex items-center mt-2 text-sm text-warning hover:text-warning/80 transition-colors"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Configurer maintenant
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card-elevated p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Actions rapides</h3>
                <div className="space-y-3">
                  <Link
                    to={`/admin/shops/${id}/products`}
                    className="card-interactive p-4 block"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Gérer les produits</h4>
                        <p className="text-sm text-muted-foreground">Voir et modifier vos fiches produits</p>
                      </div>
                    </div>
                  </Link>
                  <Link
                    to={`/admin/shops/${id}/blog`}
                    className="card-interactive p-4 block"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-info/10 rounded-lg">
                        <FileText className="w-5 h-5 text-info" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Articles de blog</h4>
                        <p className="text-sm text-muted-foreground">Générer du contenu pour votre blog</p>
                      </div>
                    </div>
                  </Link>
                  <Link
                    to={`/admin/shops/${id}/diagnostics`}
                    className="card-interactive p-4 block"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-warning/10 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Diagnostics SEO</h4>
                        <p className="text-sm text-muted-foreground">Analyser et corriger les problèmes</p>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>

              <div className="card-elevated p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Informations boutique</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Type :</span>
                    <StatusBadge status="neutral" variant="outline">{shop.type}</StatusBadge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">URL :</span>
                    <a 
                      href={shop.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 truncate max-w-xs transition-colors"
                    >
                      {shop.url}
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Langue :</span>
                    <span className="font-medium text-foreground">{shop.language}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Statut :</span>
                    <StatusBadge status="success" variant="dot">
                      Connectée
                    </StatusBadge>
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