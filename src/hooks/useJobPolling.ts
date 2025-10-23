import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface JobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  processed_items: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  total_items: number;
  current_item: string | null;
  error_message: string | null;
}

interface UseJobPollingOptions {
  onUpdate?: (job: JobStatus) => void;
  onDone?: (job: JobStatus) => void;
  onError?: (error: string) => void;
  intervalMs?: number;
}

export function useJobPolling() {
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const jobIdRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);
  const staleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTsRef = useRef<number | null>(null);
  const lastProcessedRef = useRef<number>(0);
  const lastJobRef = useRef<JobStatus | null>(null);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (staleTimerRef.current) {
      clearInterval(staleTimerRef.current);
      staleTimerRef.current = null;
    }
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (e) {
        console.warn('Failed to remove realtime channel', e);
      }
      channelRef.current = null;
    }
    setIsPolling(false);
  };

  const startPolling = (
    jobId: string,
    options: UseJobPollingOptions = {}
  ) => {
    const {
      onUpdate,
      onDone,
      onError,
      intervalMs = 3000,
    } = options;

    // Stop any existing polling
    stopPolling();

    jobIdRef.current = jobId;
    setIsPolling(true);
    lastUpdateTsRef.current = Date.now();

    // Realtime subscription for immediate updates
    try {
      channelRef.current = supabase
        .channel(`job-status-${jobId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'generation_jobs', filter: `id=eq.${jobId}` },
          (payload) => {
            const job = payload.new as any;
            const jobStatus: JobStatus = {
              id: job.id,
              status: job.status as JobStatus['status'],
              progress: job.progress || 0,
              processed_items: job.processed_items || 0,
              success_count: job.success_count || 0,
              failed_count: job.failed_count || 0,
              skipped_count: job.skipped_count || 0,
              total_items: job.total_items || 0,
              current_item: job.current_item,
              error_message: job.error_message,
            };
            lastJobRef.current = jobStatus;
            lastUpdateTsRef.current = Date.now();
            lastProcessedRef.current = jobStatus.processed_items;
            onUpdate?.(jobStatus);

            const isComplete = job.status === 'completed';
            const allProcessed = jobStatus.processed_items >= jobStatus.total_items && jobStatus.total_items > 0;
            const isFailed = job.status === 'failed';

            if (isComplete || allProcessed || isFailed) {
              stopPolling();
              if (isFailed) {
                onError?.(job.error_message || 'Job failed');
              } else {
                onDone?.(jobStatus);
              }
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription failed, falling back to polling only:', e);
    }

    const pollJob = async () => {
      if (!jobIdRef.current) return;

      try {
        const { data: job, error } = await supabase
          .from('generation_jobs')
          .select('*')
          .eq('id', jobIdRef.current)
          .single();

        if (error) {
          console.error('Error fetching job status:', error);
          onError?.(error.message);
          return;
        }

        if (!job) {
          onError?.('Job not found');
          stopPolling();
          return;
        }

        const jobStatus: JobStatus = {
          id: job.id,
          status: job.status as JobStatus['status'],
          progress: job.progress || 0,
          processed_items: job.processed_items || 0,
          success_count: job.success_count || 0,
          failed_count: job.failed_count || 0,
          skipped_count: job.skipped_count || 0,
          total_items: job.total_items || 0,
          current_item: job.current_item,
          error_message: job.error_message,
        };

        console.log('Job status:', jobStatus.status, `${jobStatus.progress}%`);

        lastJobRef.current = jobStatus;
        lastUpdateTsRef.current = Date.now();
        lastProcessedRef.current = jobStatus.processed_items;
        onUpdate?.(jobStatus);

        // Job completed or all items processed (fallback to prevent UI blocking)
        const isComplete = job.status === 'completed';
        const allProcessed = jobStatus.processed_items >= jobStatus.total_items && jobStatus.total_items > 0;
        
        if (isComplete || allProcessed) {
          stopPolling();
          onDone?.(jobStatus);
        }

        // Job failed
        if (job.status === 'failed') {
          stopPolling();
          onError?.(job.error_message || 'Job failed');
        }
      } catch (error) {
        console.error('Error in polling:', error);
        onError?.(error instanceof Error ? error.message : 'Unknown error');
        stopPolling();
      }
    };

    // Start polling immediately, then at intervals
    pollJob();
    intervalRef.current = setInterval(pollJob, intervalMs);

    // Fallback: if updates stall but all items appear processed, finish UI to avoid blocking
    staleTimerRef.current = setInterval(() => {
      const last = lastUpdateTsRef.current;
      const snapshot = lastJobRef.current;
      if (!snapshot || !last) return;
      const staleMs = Date.now() - last;
      const allProcessed = snapshot.processed_items >= snapshot.total_items && snapshot.total_items > 0;
      if (staleMs > Math.max(intervalMs * 5, 15000) && allProcessed) {
        console.warn('Stale job updates detected, finalizing UI via fallback');
        stopPolling();
        onDone?.(snapshot);
      }
    }, Math.max(intervalMs * 2, 6000));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    startPolling,
    stopPolling,
    isPolling,
  };
}
