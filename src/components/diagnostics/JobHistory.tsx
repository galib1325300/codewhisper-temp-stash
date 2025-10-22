import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Job {
  id: string;
  type: string;
  status: string;
  progress: number;
  total_items: number;
  processed_items: number;
  success_count: number;
  failed_count: number;
  created_at: string;
  error_message?: string;
}

interface JobHistoryProps {
  shopId: string;
}

export default function JobHistory({ shopId }: JobHistoryProps) {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    const loadJobs = async () => {
      const { data } = await supabase
        .from('generation_jobs')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setJobs(data);
      }
    };

    loadJobs();

    // Poll for updates every 5 seconds
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, [shopId]);

  if (jobs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des traitements</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                {job.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {job.status === 'failed' && <XCircle className="w-5 h-5 text-red-600" />}
                {job.status === 'processing' && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
                {job.status === 'pending' && <Clock className="w-5 h-5 text-gray-400" />}

                <div>
                  <p className="font-medium capitalize">{job.type}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: fr })}
                  </p>
                  {job.error_message && (
                    <p className="text-xs text-red-600 mt-1">{job.error_message}</p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <Badge variant={
                  job.status === 'completed' ? 'default' :
                  job.status === 'failed' ? 'destructive' :
                  job.status === 'processing' ? 'secondary' : 'outline'
                }>
                  {job.status}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  {job.processed_items}/{job.total_items} ({job.progress}%)
                </p>
                {job.status === 'completed' && (
                  <p className="text-xs text-muted-foreground">
                    ✓ {job.success_count} {job.failed_count > 0 && `/ ✗ ${job.failed_count}`}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
