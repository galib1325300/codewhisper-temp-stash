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

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
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

        onUpdate?.(jobStatus);

        // Job completed
        if (job.status === 'completed') {
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
