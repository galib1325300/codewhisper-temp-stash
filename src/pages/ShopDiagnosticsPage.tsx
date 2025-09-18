import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import ShopNavigation from '../components/ShopNavigation';
import Button from '../components/Button';
import { getShopById } from '../utils/shops';
import { SEOContentService } from '../utils/seoContent';
import { Shop } from '../utils/types';
import { AlertTriangle, CheckCircle, Info, RefreshCw, Plus, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function ShopDiagnosticsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

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

  const runDiagnostic = async () => {
    if (!shop) return;
    
    setDiagnosticLoading(true);
    try {
      const result = await SEOContentService.runSEODiagnostic(shop.id);
      if (result.success && result.report) {
        setReport(result.report);
        toast.success('Diagnostic SEO terminé');
      } else {
        toast.error(result.error || 'Erreur lors du diagnostic');
      }
    } catch (error) {
      toast.error('Erreur lors du diagnostic');
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const isShopConnected = () => {
    if (!shop) return false;
    return !!(shop.consumerKey && shop.consumerSecret);
  };

  const handleConfigureConnection = () => {
    if (shop) {
      navigate(`/admin/shops/${shop.id}/settings`);
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

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
                {!isShopConnected() ? (
                  <div className="text-center py-12">
                    <div className="text-amber-500 mb-4">
                      <Settings className="w-12 h-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Boutique non connectée
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Vous devez connecter votre boutique pour effectuer des diagnostics SEO
                    </p>
                    <Button onClick={handleConfigureConnection}>
                      <Settings className="w-4 h-4 mr-2" />
                      Configurer la connexion
                    </Button>
                  </div>
                ) : (
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
                    <Button onClick={runDiagnostic} disabled={diagnosticLoading}>
                      {diagnosticLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      {diagnosticLoading ? 'Diagnostic en cours...' : 'Lancer un diagnostic'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}