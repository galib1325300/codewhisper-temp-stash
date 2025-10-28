import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { History, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface OptimizationHistoryEntry {
  id: string;
  optimization_type: string;
  score_before: number | null;
  score_after: number | null;
  changes_applied: any;
  applied_at: string;
}

interface SEOOptimizationHistoryProps {
  postId: string;
}

const categoryLabels: Record<string, string> = {
  metadata: "Métadonnées",
  keywords: "Mots-clés",
  content: "Contenu",
  links: "Liens",
  faq: "FAQ",
  full: "Optimisation complète"
};

export function SEOOptimizationHistory({ postId }: SEOOptimizationHistoryProps) {
  const [history, setHistory] = useState<OptimizationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [postId]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_optimization_history')
        .select('*')
        .eq('post_id', postId)
        .order('applied_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching optimization history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreDelta = (before: number | null, after: number | null) => {
    if (!before || !after) return null;
    return after - before;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historique des optimisations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historique des optimisations
          </CardTitle>
          <CardDescription>
            Aucune optimisation n'a encore été appliquée à cet article
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Historique des optimisations
        </CardTitle>
        <CardDescription>
          {history.length} optimisation{history.length > 1 ? 's' : ''} appliquée{history.length > 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry) => {
            const delta = getScoreDelta(entry.score_before, entry.score_after);
            
            return (
              <div
                key={entry.id}
                className="flex items-start justify-between p-4 border rounded-lg bg-secondary/5"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {categoryLabels[entry.optimization_type] || entry.optimization_type}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {format(new Date(entry.applied_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                    </div>
                  </div>

                  {entry.changes_applied?.changes_summary && (
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      {entry.changes_applied.changes_summary.slice(0, 3).map((change: string, idx: number) => (
                        <li key={idx}>{change}</li>
                      ))}
                    </ul>
                  )}

                  {entry.changes_applied?.changes && (
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      {entry.changes_applied.changes.slice(0, 3).map((change: string, idx: number) => (
                        <li key={idx}>{change}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {delta !== null && (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      {delta > 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : delta < 0 ? (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      ) : null}
                      <span className={`text-sm font-semibold ${
                        delta > 0 ? 'text-green-500' : delta < 0 ? 'text-red-500' : ''
                      }`}>
                        {delta > 0 ? '+' : ''}{delta}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.score_before} → {entry.score_after}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
