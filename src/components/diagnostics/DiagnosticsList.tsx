import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, Eye, Play, RefreshCw, Info } from 'lucide-react';
import { toast } from 'sonner';
import { SEOContentService } from '@/utils/seoContent';
import { WooCommerceService } from '@/utils/woocommerce';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Diagnostic {
  id: string;
  status: string;
  score: number | null;
  total_issues: number;
  errors_count: number;
  warnings_count: number;
  info_count: number;
  created_at: string;
}

interface DiagnosticsListProps {
  shopId: string;
}

export default function DiagnosticsList({ shopId }: DiagnosticsListProps) {
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningDiagnostic, setRunningDiagnostic] = useState(false);
  const [hoursSinceSync, setHoursSinceSync] = useState<number | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [syncingProducts, setSyncingProducts] = useState(false);

  useEffect(() => {
    loadDiagnostics();
    loadSyncStatus();
  }, [shopId]);

  const loadDiagnostics = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_diagnostics')
        .select('id, status, score, total_issues, errors_count, warnings_count, info_count, created_at')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiagnostics(data || []);
    } catch (error) {
      console.error('Error loading diagnostics:', error);
      toast.error('Erreur lors du chargement des diagnostics');
    } finally {
      setLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    try {
      // Solution 4: Check when products were last synced
      const { data: lastProduct } = await supabase
        .from('products')
        .select('updated_at')
        .eq('shop_id', shopId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shopId);

      setTotalProducts(count || 0);

      if (lastProduct?.updated_at) {
        const lastSyncDate = new Date(lastProduct.updated_at);
        const now = new Date();
        const hours = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60);
        setHoursSinceSync(Math.round(hours * 10) / 10);
      }
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const handleResyncProducts = async () => {
    setSyncingProducts(true);
    try {
      toast.info('🔄 Synchronisation des produits en cours...');
      const result = await WooCommerceService.syncProducts(shopId);
      if (result.success) {
        toast.success(`✅ ${result.count} produits synchronisés`);
        loadSyncStatus();
      } else {
        toast.error(result.error || 'Erreur lors de la synchronisation');
      }
    } catch (error) {
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setSyncingProducts(false);
    }
  };

  const runNewDiagnostic = async () => {
    setRunningDiagnostic(true);
    try {
      const result = await SEOContentService.runSEODiagnostic(shopId);
      if (result.success) {
        toast.success('Diagnostic SEO terminé');
        loadDiagnostics();
      } else {
        toast.error(result.error || 'Erreur lors du diagnostic');
      }
    } catch (error) {
      toast.error('Erreur lors du diagnostic');
    } finally {
      setRunningDiagnostic(false);
    }
  };

  // Solution 5: Full diagnostic with re-sync
  const handleFullDiagnostic = async () => {
    setRunningDiagnostic(true);
    try {
      // Step 1: Re-sync products
      toast.info('🔄 Étape 1/2 : Synchronisation des produits...');
      const syncResult = await WooCommerceService.syncProducts(shopId);
      
      if (!syncResult.success) {
        throw new Error(syncResult.error || 'Échec de la synchronisation');
      }

      toast.success(`✅ ${syncResult.count} produits synchronisés`);
      
      // Step 2: Run diagnostic (which will delete old ones)
      toast.info('🔍 Étape 2/2 : Analyse SEO en cours...');
      const diagResult = await SEOContentService.runSEODiagnostic(shopId);
      
      if (diagResult.success) {
        toast.success('✅ Diagnostic complet terminé !');
        loadDiagnostics();
        loadSyncStatus();
      } else {
        toast.error(diagResult.error || 'Erreur lors du diagnostic');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors du diagnostic complet');
    } finally {
      setRunningDiagnostic(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminé';
      case 'running': return 'En cours';
      case 'error': return 'Erreur';
      default: return 'En attente';
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-500';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Solution 4: Display sync status */}
      {hoursSinceSync !== null && (
        <div className={`border rounded-lg p-4 ${hoursSinceSync > 12 ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <Info className={`w-5 h-5 mt-0.5 ${hoursSinceSync > 12 ? 'text-yellow-600' : 'text-blue-600'}`} />
              <div>
                <p className={`text-sm font-medium ${hoursSinceSync > 12 ? 'text-yellow-900' : 'text-blue-900'}`}>
                  État de synchronisation
                </p>
                <p className={`text-xs mt-1 ${hoursSinceSync > 12 ? 'text-yellow-700' : 'text-blue-700'}`}>
                  Dernière synchro : <strong>il y a {hoursSinceSync}h</strong>
                  {hoursSinceSync > 12 && (
                    <span className="ml-2">⚠️ Données potentiellement obsolètes</span>
                  )}
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleResyncProducts}
              disabled={syncingProducts}
            >
              {syncingProducts ? (
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3 mr-1" />
              )}
              Re-synchroniser
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Historique des diagnostics</h2>
        
        {/* Solution 5: Full diagnostic dialog */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={runningDiagnostic}>
              {runningDiagnostic ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {runningDiagnostic ? 'Diagnostic en cours...' : 'Nouveau diagnostic'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Lancer un nouveau diagnostic ?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  <div className="text-sm text-muted-foreground mb-3">
                    Cette action va :
                  </div>
                  <ul className="list-disc ml-6 space-y-1 text-sm text-muted-foreground">
                    <li>Supprimer l'historique des anciens diagnostics</li>
                    <li>Re-synchroniser tous les produits depuis WooCommerce</li>
                    <li>Analyser à nouveau tous les éléments (produits, collections, articles)</li>
                    <li>Générer un nouveau score SEO</li>
                  </ul>
                  {totalProducts > 0 && (
                    <div className="mt-3 text-sm font-medium text-muted-foreground">
                      ⏱️ Durée estimée : 2-5 minutes pour {totalProducts} produits
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleFullDiagnostic}>
                Lancer le diagnostic complet
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {diagnostics.length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Aucun diagnostic effectué
          </h3>
          <p className="text-muted-foreground mb-4">
            Lancez votre premier diagnostic SEO pour identifier les problèmes
          </p>
          <Button onClick={runNewDiagnostic} disabled={runningDiagnostic}>
            {runningDiagnostic ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {runningDiagnostic ? 'Diagnostic en cours...' : 'Lancer un diagnostic'}
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Score SEO
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Sujets à traiter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date de création
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {diagnostics.map((diagnostic, index) => (
                  <tr key={diagnostic.id} className="hover:bg-muted/25">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-muted-foreground">
                      #{diagnostic.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(diagnostic.status)}
                        <span className="text-sm text-foreground">
                          {getStatusText(diagnostic.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {diagnostic.score ? (
                        <span className={`text-lg font-semibold ${getScoreColor(diagnostic.score)}`}>
                          {diagnostic.score}/100
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {diagnostic.errors_count > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {diagnostic.errors_count} erreurs
                          </Badge>
                        )}
                        {diagnostic.warnings_count > 0 && (
                          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                            {diagnostic.warnings_count} avertissements
                          </Badge>
                        )}
                        {diagnostic.info_count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {diagnostic.info_count} infos
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(diagnostic.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {diagnostic.status === 'completed' && index === 0 ? (
                        <Link to={`/admin/shops/${shopId}/diagnostics/${diagnostic.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            Détails
                          </Button>
                        </Link>
                      ) : diagnostic.status === 'completed' ? (
                        <Badge variant="secondary" className="text-xs">
                          Ancien diagnostic
                        </Badge>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}