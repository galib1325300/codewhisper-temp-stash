import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useJobPolling } from '@/hooks/useJobPolling';
import { CheckCircle2, Loader2 } from 'lucide-react';

// Local storage key for persisting the active job
const LS_KEY = 'seoActiveJob';

interface ActiveJobMeta {
  jobId: string;
  diagnosticId: string;
  shopId: string;
  label?: string;
}

export default function BackgroundJobBanner() {
  const [activeJob, setActiveJob] = useState<ActiveJobMeta | null>(null);
  const [hidden, setHidden] = useState(false);
  const hideForPathRef = useRef<string | null>(null);
  const location = useLocation();

  const { startPolling, stopPolling, isPolling } = useJobPolling();
  const [progress, setProgress] = useState(0);
  const [counts, setCounts] = useState({ processed: 0, total: 0, success: 0, failed: 0, skipped: 0 });

  // Load job from localStorage on mount and when storage changes
  useEffect(() => {
    const loadJob = () => {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const parsed: ActiveJobMeta = JSON.parse(raw);
          if (parsed?.jobId) {
            setActiveJob(parsed);
            setHidden(false); // Show banner when new job detected
          }
        }
      } catch {}
    };

    // Load initially
    loadJob();

    // Listen for custom event when job is put in background
    const handleJobBackground = () => {
      console.log('Job background event received, reloading job from localStorage');
      loadJob();
    };

    window.addEventListener('job:background', handleJobBackground);

    return () => {
      window.removeEventListener('job:background', handleJobBackground);
    };
  }, []);

  // If route changes and the user hid the banner only for a route, show again
  useEffect(() => {
    if (hideForPathRef.current && hideForPathRef.current !== location.pathname) {
      setHidden(false);
      hideForPathRef.current = null;
    }
  }, [location.pathname]);

  // Start polling when we have an active job
  useEffect(() => {
    if (!activeJob) return;

    startPolling(activeJob.jobId, {
      onUpdate: (job) => {
        const pct = job.total_items && job.total_items > 0 ? (job.processed_items / job.total_items) * 100 : (job.progress || 0);
        setProgress(Math.max(pct, job.progress || 0));
        setCounts({
          processed: job.processed_items || 0,
          total: job.total_items || 0,
          success: job.success_count || 0,
          failed: job.failed_count || 0,
          skipped: job.skipped_count || 0,
        });
      },
      onDone: (job) => {
        setProgress(100);
        setCounts({
          processed: job.processed_items || 0,
          total: job.total_items || 0,
          success: job.success_count || 0,
          failed: job.failed_count || 0,
          skipped: job.skipped_count || 0,
        });

        // Notify and clean up
        toast.success('Traitement terminé. Pensez à relancer un diagnostic complet.');
        try {
          localStorage.removeItem(LS_KEY);
        } catch {}
        setActiveJob(null);
        stopPolling();

        // Inform pages to refresh their data
        const detail = { diagnosticId: activeJob.diagnosticId, shopId: activeJob.shopId };
        window.dispatchEvent(new CustomEvent('diagnostic:refresh', { detail }));
      },
      onError: (err) => {
        toast.error(`Erreur du traitement: ${err}`);
        try {
          localStorage.removeItem(LS_KEY);
        } catch {}
        setActiveJob(null);
        stopPolling();
      },
      intervalMs: 3000,
    });

    return () => {
      if (isPolling) stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeJob?.jobId]);

  if (!activeJob || hidden) return null;

  const toDetail = `/admin/shops/${activeJob.shopId}/diagnostics/${activeJob.diagnosticId}`;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(680px,95vw)]">
      <Card className="border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg">
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {progress < 100 ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              )}
              <p className="text-sm font-medium text-foreground">
                Travail en cours{activeJob.label ? ` · ${activeJob.label}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to={toDetail} className="hidden sm:block">
                <Button size="sm" variant="outline">Voir les détails</Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => { setHidden(true); hideForPathRef.current = location.pathname; }}>Masquer</Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progression</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />

          <div className="mt-2 text-xs text-muted-foreground">
            <span>Traité: {counts.processed} / {counts.total}</span>
            {counts.success + counts.failed + counts.skipped > 0 && (
              <span className="ml-2">· ✅ {counts.success} · ⚠️ {counts.failed} · ℹ️ {counts.skipped}</span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
