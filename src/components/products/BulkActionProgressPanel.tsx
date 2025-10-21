import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BulkActionProgressPanelProps {
  shopId: string;
}

interface JobStatus {
  id: string;
  product_id: string;
  action: string;
  status: string;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export function BulkActionProgressPanel({ shopId }: BulkActionProgressPanelProps) {
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });

  useEffect(() => {
    loadJobs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('job-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_generation_jobs',
          filter: `shop_id=eq.${shopId}`,
        },
        () => {
          loadJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId]);

  const loadJobs = async () => {
    const { data, error } = await supabase
      .from('product_generation_jobs')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading jobs:', error);
      return;
    }

    if (data) {
      setJobs(data);
      
      // Calculate stats
      const newStats = {
        total: data.length,
        pending: data.filter(j => j.status === 'pending').length,
        processing: data.filter(j => j.status === 'processing').length,
        completed: data.filter(j => j.status === 'completed').length,
        failed: data.filter(j => j.status === 'failed').length,
      };
      setStats(newStats);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-error" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-info animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="border-success text-success">Terminé</Badge>;
      case 'failed':
        return <Badge variant="outline" className="border-error text-error">Échec</Badge>;
      case 'processing':
        return <Badge variant="outline" className="border-info text-info">En cours</Badge>;
      default:
        return <Badge variant="outline">En attente</Badge>;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      complete: 'Fiche complète',
      long_descriptions: 'Description longue',
      short_descriptions: 'Description courte',
      alt_images: 'Textes alt images',
      internal_linking: 'Maillage interne',
      translate: 'Traduction',
    };
    return labels[action] || action;
  };

  const progressPercentage = stats.total > 0
    ? Math.round(((stats.completed + stats.failed) / stats.total) * 100)
    : 0;

  if (stats.total === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Génération en cours</h3>
            <span className="text-xs text-muted-foreground">
              {stats.completed + stats.failed} / {stats.total}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="text-center">
            <div className="font-semibold text-muted-foreground">{stats.pending}</div>
            <div className="text-muted-foreground">En attente</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-info">{stats.processing}</div>
            <div className="text-muted-foreground">En cours</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-success">{stats.completed}</div>
            <div className="text-muted-foreground">Réussis</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-error">{stats.failed}</div>
            <div className="text-muted-foreground">Échecs</div>
          </div>
        </div>

        {jobs.length > 0 && (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {jobs.slice(0, 10).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-2 rounded-lg border bg-card text-xs"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {getStatusIcon(job.status)}
                    <span className="font-medium">{getActionLabel(job.action)}</span>
                  </div>
                  {getStatusBadge(job.status)}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </Card>
  );
}