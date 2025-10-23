import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Zap, CheckCircle, Clock, AlertTriangle, ExternalLink, Wand2, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import IssueItemSelector from './IssueItemSelector';
import { useJobPolling } from '@/hooks/useJobPolling';

// Utility function to generate product URLs
const generateProductUrl = (shopUrl: string, productSlug: string, shopType: string): string => {
  const baseUrl = shopUrl.replace(/\/$/, ''); // Remove trailing slash
  
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

interface IssueActionsProps {
  issue: {
    type: 'error' | 'warning' | 'info' | 'success';
    category: string;
    title: string;
    description: string;
    recommendation?: string;
    affected_items?: any[];
    resource_type?: 'product' | 'collection' | 'blog' | 'general';
    action_available?: boolean;
    score_improvement?: number;
  };
  shopId: string;
  diagnosticId: string;
  shopUrl?: string;
  shopType?: string;
  issueIndex?: number;
  onIssueResolved?: () => void;
}

export default function IssueActions({ issue, shopId, diagnosticId, shopUrl, shopType, issueIndex, onIssueResolved }: IssueActionsProps) {
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [resolvedItems, setResolvedItems] = useState<string[]>([]); 
  const [progress, setProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState<string>('');
  const [processedCount, setProcessedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  

  const { startPolling, stopPolling, isPolling } = useJobPolling();

  // Enrich all items with URLs
  const enrichedItems = issue.affected_items?.map(item => ({
    ...item,
    url: item.slug && shopUrl && shopType ? generateProductUrl(shopUrl, item.slug, shopType) : undefined
  })) || [];

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <ExternalLink className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <ExternalLink className="w-5 h-5 text-gray-500" />;
    }
  };

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'error': return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      case 'warning': return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
      case 'info': return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950';
      case 'success': return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getActionText = () => {
    if (resolved) return 'Résolu';
    if (resolving) return 'Résolution...';
    
    switch (issue.category) {
      case 'Images':
        return 'Générer textes alt';
      case 'Contenu':
        return 'Générer descriptions';
      case 'SEO':
        return 'Optimiser SEO';
      case 'Structure':
        return 'Structurer contenu';
      case 'Génération IA':
        return 'Générer avec IA';
      case 'Maillage interne':
        return 'Ajouter liens';
      case 'Mise en forme':
        return 'Ajouter mots-clés en gras';
      default:
        return 'Résoudre automatiquement';
    }
  };

  const handleAutoResolve = async (itemIds: string[]) => {
    if (!issue.action_available || !issue.affected_items?.length || itemIds.length === 0) return;
    
    setResolving(true);
    setProgress(0);
    setProcessedCount(0);
    setSuccessCount(0);
    setFailedCount(0);
    setSkippedCount(0);
    setCurrentItem('');
    
    try {
      const selectedAffectedItems = issue.affected_items.filter(item => 
        itemIds.includes(item.id)
      );

      setTotalItems(selectedAffectedItems.length);

      // Queue job
      const { data: queueResult, error: queueError } = await supabase.functions.invoke('queue-seo-resolution', {
        body: {
          shopId,
          diagnosticId,
          issueType: issue.category,
          affectedItems: selectedAffectedItems.map(item => ({
            id: item.id,
            type: item.type,
            name: item.name || item.title
          }))
        }
      });

      if (queueError) {
        if (queueError.message?.includes('déjà en cours')) {
          toast.error('Un traitement similaire est déjà en cours. Veuillez attendre.');
          setResolving(false);
          return;
        }
        throw new Error(queueError.message || 'Failed to queue job');
      }

      if (!queueResult?.success) {
        throw new Error('Failed to queue job');
      }

      const jobId = queueResult.jobId;
      console.log('Job queued with ID:', jobId);

      // Use polling hook
      startPolling(jobId, {
        onUpdate: (job) => {
          const derived = job.total_items && job.total_items > 0
            ? (job.processed_items / job.total_items) * 100
            : (job.progress || 0);
          setTotalItems(job.total_items || selectedItems.length);
          setProgress(Math.max(derived, job.progress || 0));
          setProcessedCount(job.processed_items);
          setSuccessCount(job.success_count);
          setFailedCount(job.failed_count);
          setSkippedCount(job.skipped_count);
          setCurrentItem(job.current_item || '');
        },
        onDone: (job) => {
          setProgress(100);
          
          const messages = [];
          if (job.success_count > 0) {
            messages.push(`✅ ${job.success_count} succès`);
          }
          if (job.failed_count > 0) {
            messages.push(`⚠️ ${job.failed_count} échecs`);
          }
          if (job.skipped_count > 0) {
            messages.push(`ℹ️ ${job.skipped_count} ignorés`);
          }
          
          toast.success(messages.join(', '), { duration: 5000 });

          onIssueResolved?.();
          setResolving(false);
          setSelectedItems([]);
        },
        onError: (error) => {
          toast.error(`Erreur: ${error}`);
          setResolving(false);
        },
        intervalMs: 3000
      });

    } catch (error) {
      console.error('Error in auto-resolve:', error);
      toast.error('Erreur lors du lancement du traitement');
      setResolving(false);
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (isPolling) {
        stopPolling();
      }
    };
  }, [isPolling, stopPolling]);

  return (
    <>
      {/* Progress Overlay */}
      {resolving && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Résolution en cours...</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progression</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Traité : {processedCount} / {totalItems || selectedItems.length}</p>
                  {(successCount > 0 || failedCount > 0 || skippedCount > 0) && (
                    <p className="text-xs">
                      ✅ {successCount} · ⚠️ {failedCount} · ℹ️ {skippedCount}
                    </p>
                  )}
                  {currentItem && (
                    <p className="mt-2 truncate">
                      En cours : <strong>{currentItem}</strong>
                    </p>
                  )}
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    ⏱️ Cette opération peut prendre quelques minutes. 
                    Ne fermez pas cette fenêtre.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className={`border ${getIssueColor(issue.type)}`}>
      <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {getIssueIcon(issue.type)}
                {issue.type === 'success' && issue.score_improvement && (
                  <Badge variant="outline" className="border-green-600 text-green-600 bg-green-50">
                    +{issue.score_improvement} points SEO
                  </Badge>
                )}
              </div>
              <div>
                <CardTitle className="text-lg">{issue.title}</CardTitle>
                <Badge variant="outline" className="mt-1">
                  {issue.category}
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {issueIndex !== undefined && (
                <Link to={`/admin/shops/${shopId}/diagnostics/${diagnosticId}/issue/${encodeURIComponent(`${issue.category}|${issue.title}|${issue.resource_type || 'general'}`)}`}>
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Détails
                  </Button>
                </Link>
              )}
              {issue.action_available && !resolved && enrichedItems.length > 0 && (
                <IssueItemSelector
                  items={enrichedItems.filter(item => !resolvedItems.includes(item.id))}
                  selectedItems={selectedItems}
                  onSelectionChange={setSelectedItems}
                  issueTitle={issue.title}
                  issueType={issue.category}
                  actionButtonText={getActionText()}
                  onAction={handleAutoResolve}
                  isLoading={resolving}
                />
              )}
            </div>
          </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{issue.description}</p>
        
        {issue.type === 'success' && issue.score_improvement && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-md">
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">
              🎉 +{issue.score_improvement} points de score SEO
            </p>
          </div>
        )}
        
        {issue.recommendation && issue.type !== 'success' && (
          <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-md">
            <p className="text-sm font-medium text-foreground mb-1">💡 Recommandation</p>
            <p className="text-sm text-muted-foreground">{issue.recommendation}</p>
          </div>
        )}
        
        {enrichedItems.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">
              Éléments concernés ({enrichedItems.length - resolvedItems.length} restants sur {enrichedItems.length}) :
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {enrichedItems.filter(item => !resolvedItems.includes(item.id)).slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 bg-background rounded border">
                  <span className="truncate">{item.name || item.title}</span>
                  <div className="flex items-center space-x-1">
                    <Badge variant="secondary" className="text-xs">
                      {item.type}
                    </Badge>
                    {item.url && (
                      <Button size="sm" variant="ghost" className="h-auto p-1" asChild>
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          title="Voir en ligne"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {enrichedItems.filter(item => !resolvedItems.includes(item.id)).length > 3 && (
                <div className="text-sm text-muted-foreground p-2 bg-muted rounded border text-center">
                  ... et {enrichedItems.filter(item => !resolvedItems.includes(item.id)).length - 3} autres éléments
                  <br />
                  <span className="text-xs">Utilisez le sélecteur ci-dessus pour voir tous les éléments</span>
                </div>
              )}
              
              {/* Show resolved items */}
              {resolvedItems.length > 0 && (
                <div className="border-t pt-2 mt-2">
                  <p className="text-sm font-medium text-green-600 mb-1">
                    Éléments traités ({resolvedItems.length}) :
                  </p>
                  {enrichedItems.filter(item => resolvedItems.includes(item.id)).slice(0, 2).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2 bg-green-50 rounded border border-green-200">
                      <span className="truncate">{item.name || item.title}</span>
                      <div className="flex items-center space-x-1">
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          Résolu
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {resolvedItems.length > 2 && (
                    <div className="text-xs text-green-600 text-center mt-1">
                      ... et {resolvedItems.length - 2} autres éléments résolus
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {resolved && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-800">
                Problème résolu automatiquement
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}