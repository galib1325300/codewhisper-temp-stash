import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, AlertTriangle, AlertCircle, Info, ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import AdminNavbar from '@/components/AdminNavbar';
import AdminSidebar from '@/components/AdminSidebar';
import ShopNavigation from '@/components/ShopNavigation';
import LoadingState from '@/components/ui/loading-state';
import { getShopById } from '@/utils/shops';
import { Shop } from '@/utils/types';

// Utility function to generate product URLs
const generateProductUrl = (shopUrl: string, productSlug: string, shopType: string): string => {
  const baseUrl = shopUrl.replace(/\/$/, '');
  
  switch (shopType) {
    case 'woocommerce':
    case 'wordpress':
      return `${baseUrl}/product/${productSlug}`;
    case 'shopify':
      return `${baseUrl}/products/${productSlug}`;
    default:
      return `${baseUrl}/product/${productSlug}`;
  }
};

export default function IssueDetailPage() {
  const { id: shopId, diagnosticId, issueIndex } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [issue, setIssue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [manuallyResolved, setManuallyResolved] = useState(false);

  useEffect(() => {
    if (shopId && diagnosticId && issueIndex !== undefined) {
      loadData();
    }
  }, [shopId, diagnosticId, issueIndex]);

  const loadData = async () => {
    try {
      // Load shop
      const shopData = await getShopById(shopId!);
      setShop(shopData);

      // Load diagnostic
      const { data: diagnostic, error } = await supabase
        .from('seo_diagnostics')
        .select('*')
        .eq('id', diagnosticId)
        .eq('shop_id', shopId)
        .maybeSingle();

      if (error) throw error;
      
      if (!diagnostic) {
        throw new Error('Diagnostic not found');
      }

      // Get the specific issue by index
      const issues = diagnostic.issues || [];
      const selectedIssue = issues[parseInt(issueIndex!)];
      
      if (!selectedIssue) {
        throw new Error('Issue not found');
      }

      // Enrich issue with product data if needed
      if (selectedIssue.affected_items && selectedIssue.affected_items.length > 0) {
        const productIds = selectedIssue.affected_items
          .filter((item: any) => item.type === 'product' && item.id)
          .map((item: any) => item.id);

        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from('products')
            .select('id, slug')
            .in('id', productIds);

          const productSlugMap = new Map(products?.map((p) => [p.id, p.slug]) || []);

          selectedIssue.affected_items = selectedIssue.affected_items.map((item: any) => ({
            ...item,
            slug: item.type === 'product' ? productSlugMap.get(item.id) : item.slug,
            url: item.type === 'product' && productSlugMap.get(item.id) && shopData
              ? generateProductUrl(shopData.url, productSlugMap.get(item.id)!, shopData.type)
              : undefined
          }));
        }
      }

      setIssue(selectedIssue);
    } catch (error) {
      console.error('Error loading issue detail:', error);
      toast.error('Erreur lors du chargement du problème');
    } finally {
      setLoading(false);
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-500" />;
      default:
        return <Info className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    if (manuallyResolved) {
      return <Badge variant="default" className="bg-green-500">Résolu manuellement</Badge>;
    }
    return <Badge variant="destructive">À résoudre</Badge>;
  };

  const getCreditCost = () => {
    if (!issue?.affected_items) return { perItem: 0, total: 0 };
    
    const itemCount = issue.affected_items.length;
    let perItem = 1;

    // Adjust per-item cost based on issue type
    switch (issue.category) {
      case 'Images':
        perItem = 1;
        break;
      case 'Contenu':
      case 'Génération IA':
        perItem = 2;
        break;
      case 'SEO':
      case 'Structure':
        perItem = 1;
        break;
      case 'Maillage interne':
        perItem = 1;
        break;
      default:
        perItem = 1;
    }

    return { perItem, total: perItem * itemCount };
  };

  const getResolutionDescription = () => {
    switch (issue?.category) {
      case 'Images':
        return 'Générer les textes des balises alt des images des produits';
      case 'Contenu':
        return 'Générer des descriptions détaillées et optimisées SEO';
      case 'Génération IA':
        return 'Créer du contenu riche et structuré avec l\'IA';
      case 'SEO':
        return 'Optimiser les méta-descriptions et titres SEO';
      case 'Structure':
        return 'Structurer le contenu avec des listes et sous-titres';
      case 'Maillage interne':
        return 'Ajouter des liens internes pertinents vers d\'autres pages';
      case 'Mise en forme':
        return 'Mettre en gras les mots-clés importants dans les descriptions';
      default:
        return 'Résoudre automatiquement ce problème';
    }
  };

  const handleResolve = async () => {
    if (!issue?.action_available || !issue?.affected_items?.length) return;

    setResolving(true);

    try {
      // Queue the job
      const { data: queueResult, error: queueError } = await supabase.functions.invoke('queue-seo-resolution', {
        body: {
          shopId,
          diagnosticId,
          issueType: issue.category,
          affectedItems: issue.affected_items.map((item: any) => ({
            id: item.id,
            type: item.type,
            name: item.name || item.title
          }))
        }
      });

      if (queueError || !queueResult?.success) {
        throw new Error(queueError?.message || 'Failed to queue job');
      }

      const jobId = queueResult.jobId;
      console.log('Job queued with ID:', jobId);

      // Poll for progress every 3 seconds
      const pollInterval = setInterval(async () => {
        const { data: job, error: jobError } = await supabase
          .from('generation_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (jobError || !job) {
          console.error('Error fetching job status:', jobError);
          return;
        }

        console.log('Job status:', job.status, `${job.progress}%`);

        // Job completed
        if (job.status === 'completed') {
          clearInterval(pollInterval);
          
          toast.success(
            `✅ ${job.success_count} éléments traités avec succès sur ${job.total_items}`,
            { duration: 5000 }
          );

          if (job.failed_count > 0) {
            toast.warning(`⚠️ ${job.failed_count} éléments en erreur`, { duration: 5000 });
          }

          navigate(`/admin/shops/${shopId}/diagnostics/${diagnosticId}`);
        }

        // Job failed
        if (job.status === 'failed') {
          clearInterval(pollInterval);
          toast.error(`Erreur: ${job.error_message}`);
          setResolving(false);
        }
      }, 3000);

    } catch (error) {
      console.error('Error resolving issue:', error);
      toast.error('Erreur lors de la résolution du problème');
      setResolving(false);
    }
  };

  const handleMarkAsResolved = async () => {
    if (!issue || !shopId || !diagnosticId || !issueIndex) return;

    try {
      setResolving(true);

      // Get all affected item IDs
      const itemIds = issue.affected_items?.map((item: any) => item.id) || [];

      // Call the edge function to mark as manually resolved
      const { data, error } = await supabase.functions.invoke('mark-issues-manually-resolved', {
        body: {
          diagnosticId,
          issueIndex: parseInt(issueIndex),
          itemIds,
        }
      });

      if (error) throw error;

      if (data?.success) {
        setManuallyResolved(true);
        toast.success(`${data.resolvedCount} élément(s) marqué(s) comme résolu(s) manuellement`);
        
        // Reload the issue data to reflect changes
        setTimeout(() => {
          navigate(`/admin/shops/${shopId}/diagnostics/${diagnosticId}`);
        }, 1500);
      } else {
        throw new Error(data?.error || 'Erreur lors du marquage manuel');
      }
    } catch (error) {
      console.error('Error marking as resolved:', error);
      toast.error('Erreur lors du marquage manuel');
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNavbar />
        <div className="flex">
          <AdminSidebar />
          <main className="flex-1 p-8">
            <LoadingState text="Chargement du problème..." />
          </main>
        </div>
      </div>
    );
  }

  if (!shop || !issue) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNavbar />
        <div className="flex">
          <AdminSidebar />
          <main className="flex-1 p-8">
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-foreground mb-2">Problème non trouvé</h3>
              <p className="text-muted-foreground mb-4">Le problème que vous recherchez n'existe pas.</p>
              <Link to={`/admin/shops/${shopId}/diagnostics/${diagnosticId}`}>
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour au diagnostic
                </Button>
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const creditCost = getCreditCost();

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <ShopNavigation shopName={shop.name} />

            {/* Header */}
            <div>
              <Link to={`/admin/shops/${shopId}/diagnostics/${diagnosticId}`}>
                <Button variant="ghost" size="sm" className="mb-2">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Revenir au résumé du diagnostic
                </Button>
              </Link>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {getIssueIcon(issue.type)}
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">
                      Détails du problème à résoudre - {issue.title}
                    </h1>
                  </div>
                </div>
                {getStatusBadge()}
              </div>
            </div>

            {/* Issue Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Informations du problème</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Type de ressource :</p>
                    <p className="font-medium capitalize">{issue.resource_type || 'Général'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type de problème :</p>
                    <p className="font-medium">{issue.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Statut :</p>
                    <p className="font-medium">{manuallyResolved ? 'Résolu manuellement' : 'À résoudre'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Conseil :</p>
                    <p className="font-medium">{issue.recommendation}</p>
                  </div>
                </div>
                
                {issue.score_improvement > 0 && (
                  <div className={`p-4 rounded-lg border ${
                    issue.type === 'success' 
                      ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
                      : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                  }`}>
                    <h3 className={`font-semibold mb-2 ${
                      issue.type === 'success'
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-blue-900 dark:text-blue-100'
                    }`}>
                      {issue.type === 'success' ? 'Points gagnés' : 'Impact SEO potentiel'}
                    </h3>
                    <p className={issue.type === 'success' 
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-blue-800 dark:text-blue-200'
                    }>
                      {issue.type === 'success'
                        ? `Cette bonne pratique vous a fait gagner +${issue.score_improvement} points SEO !`
                        : `Résoudre ce problème pourrait améliorer votre score de +${issue.score_improvement} points`
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            {issue.action_available && !manuallyResolved && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={handleResolve} 
                    disabled={resolving}
                    className="w-full"
                    size="lg"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {resolving ? 'Résolution en cours...' : 'Résoudre le problème'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleMarkAsResolved}
                    disabled={resolving || manuallyResolved}
                    className="w-full"
                  >
                    {manuallyResolved ? 'Résolu manuellement' : 'Marquer comme résolu manuellement'}
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    Vous souhaitez résoudre ce problème vous-même ? Utilisez ce bouton pour marquer l'issue comme résolue.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Resolution Details */}
            {issue.action_available && (
              <Card>
                <CardHeader>
                  <CardTitle>Résolution du problème par l'outil</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Ce que va faire l'outil :</p>
                    <p className="font-medium">{getResolutionDescription()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Coût en crédit par fiche :</p>
                      <p className="font-medium">{creditCost.perItem}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Coût en crédit total :</p>
                      <p className="font-medium">{creditCost.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Affected Items List */}
            {issue.affected_items && issue.affected_items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    Liste des {issue.affected_items.length} {issue.resource_type === 'product' ? 'Produits' : issue.resource_type === 'collection' ? 'Collections' : 'fiches'} concernées
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {issue.affected_items.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                      >
                        <div className="flex-1">
                          {item.url ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline font-medium"
                            >
                              {item.name || item.title}
                            </a>
                          ) : (
                            <span className="font-medium">{item.name || item.title}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            {item.type}
                          </Badge>
                          {item.url && (
                            <Button size="sm" variant="ghost" className="h-auto p-2" asChild>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Voir en ligne"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
