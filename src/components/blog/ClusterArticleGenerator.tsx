import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
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
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-cluster-articles', {
        body: { 
          clusterId, 
          shopId,
          articleCount 
        }
      });

      if (error) throw error;

      setResult(data);
      setProgress(100);

      const successCount = data.success?.length || 0;
      const failedCount = data.failed?.length || 0;

      toast({
        title: "Génération terminée",
        description: `${successCount} articles créés${failedCount > 0 ? `, ${failedCount} échecs` : ''}`,
        variant: failedCount > 0 ? "destructive" : "default"
      });

      onComplete();
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Erreur de génération",
        description: error instanceof Error ? error.message : "Impossible de générer les articles",
        variant: "destructive"
      });
      setResult({ success: [], failed: [{ error: error instanceof Error ? error.message : 'Unknown error' }] });
    } finally {
      setIsGenerating(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && !result && !isGenerating) {
      handleGenerate();
    }
  }, [isOpen]);

  const successCount = result?.success?.length || 0;
  const failedCount = result?.failed?.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Génération d'articles pour "{clusterName}"</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isGenerating && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Génération en cours...
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
                Cela peut prendre quelques minutes. Ne fermez pas cette fenêtre.
              </p>
            </div>
          )}

          {result && !isGenerating && (
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
                    {successCount}
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
                    {failedCount}
                  </p>
                </div>
              </div>

              {successCount > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Articles créés :</p>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {result.success.map((article: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="truncate">{article.title}</span>
                        <Badge variant="outline" className="ml-auto flex-shrink-0">draft</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {failedCount > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    Erreurs rencontrées :
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {result.failed.map((fail: any, index: number) => (
                      <div key={index} className="text-xs bg-red-500/10 p-2 rounded border border-red-500/20">
                        Article {fail.index || index + 1}: {fail.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={onClose}>Fermer</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
