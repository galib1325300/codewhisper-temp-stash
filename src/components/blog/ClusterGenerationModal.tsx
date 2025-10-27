import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Sparkles, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SuggestedArticle {
  topic: string;
  primary_keyword: string;
  secondary_keywords: string[];
  article_type: string;
  difficulty: string;
  opportunity_score: number;
  recommended_length: number;
}

interface ClusterSuggestion {
  name: string;
  pillar_keyword: string;
  description: string;
  target_keywords: string[];
  suggested_articles: SuggestedArticle[];
}

interface AnalysisResult {
  clusters: ClusterSuggestion[];
  niche_summary: string;
  total_articles_suggested: number;
}

interface ClusterGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  onClustersCreated: () => void;
}

export const ClusterGenerationModal: React.FC<ClusterGenerationModalProps> = ({
  isOpen,
  onClose,
  shopId,
  onClustersCreated
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedClusters, setSelectedClusters] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-site-clusters', {
        body: { shopId }
      });

      if (error) throw error;

      setAnalysisResult(data);
      setSelectedClusters(new Set(data.clusters.map((_: any, i: number) => i)));
      
      toast({
        title: "Analyse terminée",
        description: `${data.clusters.length} clusters détectés avec ${data.total_articles_suggested} articles suggérés`
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Erreur d'analyse",
        description: error instanceof Error ? error.message : "Impossible d'analyser le site",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleCluster = (index: number) => {
    const newSelected = new Set(selectedClusters);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedClusters(newSelected);
  };

  const handleCreateClusters = async () => {
    if (!analysisResult) return;

    setIsCreating(true);
    try {
      const clustersToCreate = analysisResult.clusters.filter((_, i) => selectedClusters.has(i));

      for (const cluster of clustersToCreate) {
        const { error } = await supabase.from('topic_clusters').insert({
          shop_id: shopId,
          name: cluster.name,
          pillar_keyword: cluster.pillar_keyword,
          description: cluster.description,
          target_keywords: cluster.target_keywords,
          auto_generated: true,
          suggested_article_count: cluster.suggested_articles.length,
          generation_prompt: `Niche: ${analysisResult.niche_summary}`,
          status: 'active'
        });

        if (error) throw error;
      }

      toast({
        title: "Clusters créés",
        description: `${clustersToCreate.length} clusters ont été créés avec succès`
      });

      onClustersCreated();
      onClose();
    } catch (error) {
      console.error('Creation error:', error);
      toast({
        title: "Erreur de création",
        description: error instanceof Error ? error.message : "Impossible de créer les clusters",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && !analysisResult && !isAnalyzing) {
      handleAnalyze();
    }
  }, [isOpen]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'medium': return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
      case 'hard': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      default: return 'bg-muted';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Génération automatique de Topic Clusters
          </DialogTitle>
        </DialogHeader>

        {isAnalyzing && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Analyse du site en cours...</p>
            <p className="text-sm text-muted-foreground">
              Identification des thématiques principales et opportunités SEO
            </p>
          </div>
        )}

        {analysisResult && (
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Résumé de la niche :</p>
              <p className="text-muted-foreground">{analysisResult.niche_summary}</p>
              <div className="flex gap-4 mt-3">
                <Badge variant="outline">
                  {analysisResult.clusters.length} clusters détectés
                </Badge>
                <Badge variant="outline">
                  {analysisResult.total_articles_suggested} articles suggérés
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              {analysisResult.clusters.map((cluster, clusterIndex) => (
                <Card key={clusterIndex} className={`p-6 transition-all ${selectedClusters.has(clusterIndex) ? 'ring-2 ring-primary' : ''}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{cluster.name}</h3>
                        {selectedClusters.has(clusterIndex) ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{cluster.description}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="secondary" className="font-mono">
                          🎯 {cluster.pillar_keyword}
                        </Badge>
                        {cluster.target_keywords.slice(0, 3).map((kw, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                        {cluster.target_keywords.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{cluster.target_keywords.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant={selectedClusters.has(clusterIndex) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleCluster(clusterIndex)}
                    >
                      {selectedClusters.has(clusterIndex) ? "Sélectionné" : "Sélectionner"}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {cluster.suggested_articles.length} articles suggérés :
                    </p>
                    <div className="grid gap-2">
                      {cluster.suggested_articles.slice(0, 3).map((article, articleIndex) => (
                        <div key={articleIndex} className="bg-background/50 p-3 rounded border text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{article.topic}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                🔑 {article.primary_keyword}
                              </p>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Badge className={getDifficultyColor(article.difficulty)} variant="outline">
                                {article.difficulty}
                              </Badge>
                              <Badge variant="outline" className="bg-primary/10">
                                {article.opportunity_score}%
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                      {cluster.suggested_articles.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          ... et {cluster.suggested_articles.length - 3} autres articles
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} disabled={isCreating}>
                Annuler
              </Button>
              <Button 
                onClick={handleCreateClusters} 
                disabled={isCreating || selectedClusters.size === 0}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>Créer {selectedClusters.size} cluster(s)</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
