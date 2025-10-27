import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, AlertCircle, StopCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClusterArticleGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  clusterId: string;
  clusterName: string;
  shopId: string;
  articleCount: number;
  onComplete: () => void;
}

interface ArticleResult {
  title: string;
  slug: string;
  duration: number;
}

interface FailedArticle {
  index: number;
  error: string;
}

export const ClusterArticleGenerator: React.FC<ClusterArticleGeneratorProps> = ({
  isOpen,
  onClose,
  clusterId,
  clusterName,
  shopId,
  articleCount,
  onComplete
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentArticle, setCurrentArticle] = useState(0);
  const [successList, setSuccessList] = useState<ArticleResult[]>([]);
  const [failedList, setFailedList] = useState<FailedArticle[]>([]);
  const [isDone, setIsDone] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      toast({
        title: "Génération arrêtée",
        description: "La génération des articles a été interrompue.",
      });
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    setCurrentArticle(0);
    setSuccessList([]);
    setFailedList([]);
    setIsDone(false);
    abortControllerRef.current = new AbortController();

    const startTime = Date.now();

    for (let i = 0; i < articleCount; i++) {
      if (abortControllerRef.current.signal.aborted) {
        break;
      }

      setCurrentArticle(i + 1);
      const articleStartTime = Date.now();

      try {
        const { data, error } = await supabase.functions.invoke('generate-single-cluster-article', {
          body: { 
            clusterId, 
            shopId,
            articleIndex: i + 1 
          }
        });

        if (error) throw error;

        if (!data?.success) {
          throw new Error(data?.error || 'Article generation failed');
        }

        const duration = (Date.now() - articleStartTime) / 1000;
        setSuccessList(prev => [...prev, {
          title: data.article.title,
          slug: data.article.slug,
          duration
        }]);

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error generating article ${i + 1}:`, errorMsg);
        setFailedList(prev => [...prev, {
          index: i + 1,
          error: errorMsg
        }]);
      }

      setProgress(((i + 1) / articleCount) * 100);

      // Delay between articles to avoid rate limiting
      if (i < articleCount - 1 && !abortControllerRef.current.signal.aborted) {
        await sleep(2000);
      }
    }

    const totalDuration = (Date.now() - startTime) / 1000;
    setIsGenerating(false);
    setIsDone(true);

    const successCount = successList.length + (isDone ? 0 : 1);
    const failedCount = failedList.length;

    toast({
      title: "Génération terminée",
      description: `${successCount} articles créés en ${totalDuration.toFixed(0)}s${failedCount > 0 ? `, ${failedCount} échecs` : ''}`,
      variant: failedCount > 0 ? "destructive" : "default"
    });

    // Desktop notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Génération terminée', {
        body: `${successCount} articles créés pour "${clusterName}"`,
        icon: '/favicon.ico'
      });
    }

    onComplete();
  };

  React.useEffect(() => {
    if (isOpen && !isDone && !isGenerating) {
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      handleGenerate();
    }
  }, [isOpen]);

  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleClose = () => {
    if (isGenerating) {
      if (!confirm('Une génération est en cours. Voulez-vous vraiment fermer ? (La génération continuera en arrière-plan)')) {
        return;
      }
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Génération d'articles pour "{clusterName}"</DialogTitle>
          <DialogDescription>
            Génération de {articleCount} article{articleCount > 1 ? 's' : ''} optimisé{articleCount > 1 ? 's' : ''} SEO
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isGenerating && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Article {currentArticle}/{articleCount} en cours...
                </span>
                <span className="font-medium">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">
                  Création d'articles SEO optimisés...
                </p>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Durée estimée : ~{articleCount * 30}s - {articleCount * 60}s
              </p>
              <div className="flex justify-center">
                <Button variant="destructive" size="sm" onClick={handleStop}>
                  <StopCircle className="h-4 w-4 mr-2" />
                  Arrêter
                </Button>
              </div>
            </div>
          )}

          {/* Real-time success list */}
          {successList.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Articles créés ({successList.length}/{articleCount}) :
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {successList.map((article, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm bg-green-500/10 border border-green-500/20 p-2 rounded">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="truncate flex-1">{article.title}</span>
                    <span className="text-xs text-muted-foreground">{article.duration.toFixed(1)}s</span>
                    <Badge variant="outline" className="ml-auto flex-shrink-0">draft</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed articles */}
          {failedList.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                Erreurs rencontrées ({failedList.length}) :
              </p>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {failedList.map((fail, index) => (
                  <div key={index} className="text-xs bg-red-500/10 p-2 rounded border border-red-500/20">
                    <span className="font-medium">Article {fail.index}:</span> {fail.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary when done */}
          {isDone && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-700 dark:text-green-400">
                      Réussis
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                    {successList.length}
                  </p>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-700 dark:text-red-400">
                      Échecs
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-red-700 dark:text-red-400">
                    {failedList.length}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleClose}>Fermer</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};