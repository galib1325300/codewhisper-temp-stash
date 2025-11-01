import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, X, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LS_KEY = 'activeBlogGeneration';
const MAX_GENERATION_TIME = 12 * 60 * 1000; // 12 minutes
const MAX_ERROR_COUNT = 5;

interface ActiveBlogGenerationMeta {
  postId: string;
  shopId: string;
  title: string;
  startedAt: number;
}

export default function BackgroundBlogGenerationBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeGeneration, setActiveGeneration] = useState<ActiveBlogGenerationMeta | null>(null);
  const [hidden, setHidden] = useState(false);
  const [status, setStatus] = useState<'generating' | 'draft' | 'error'>('generating');
  const errorCountRef = useRef(0);
  const channelRef = useRef<any>(null);

  // Load active generation from localStorage
  useEffect(() => {
    const loadActiveGeneration = () => {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setActiveGeneration(parsed);
        } catch {
          localStorage.removeItem(LS_KEY);
        }
      }
    };

    loadActiveGeneration();

    // Listen for custom events to reload
    const handleReload = () => loadActiveGeneration();
    window.addEventListener('blogGenerationStarted', handleReload);
    return () => window.removeEventListener('blogGenerationStarted', handleReload);
  }, []);

  // Show/hide banner based on route
  useEffect(() => {
    if (!activeGeneration) return;
    
    const isOnDetailPage = location.pathname === `/admin/shops/${activeGeneration.shopId}/blog/${activeGeneration.postId}`;
    setHidden(isOnDetailPage);
  }, [location.pathname, activeGeneration]);

  // Listen for completion events from detail page
  useEffect(() => {
    const handleCompletion = () => {
      localStorage.removeItem(LS_KEY);
      setActiveGeneration(null);
    };
    
    window.addEventListener('blogGenerationCompleted', handleCompletion);
    return () => window.removeEventListener('blogGenerationCompleted', handleCompletion);
  }, []);

  // Setup realtime subscription and polling
  useEffect(() => {
    if (!activeGeneration) {
      // Cleanup channel if no active generation
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    let pollInterval: NodeJS.Timeout;
    let ttlTimeout: NodeJS.Timeout;
    
    const cleanup = () => {
      if (pollInterval) clearInterval(pollInterval);
      if (ttlTimeout) clearTimeout(ttlTimeout);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      localStorage.removeItem(LS_KEY);
      setActiveGeneration(null);
    };
    
    const handleCompletion = (newStatus: string) => {
      setStatus(newStatus as any);
      
      if (newStatus === 'draft' || newStatus === 'published') {
        toast.success('✅ Article généré avec succès !');
        cleanup();
      } else if (newStatus === 'error') {
        toast.error('❌ Erreur lors de la génération de l\'article');
        cleanup();
      }
    };
    
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('generation_status')
          .eq('id', activeGeneration.postId)
          .single();

        if (error) {
          errorCountRef.current++;
          console.error('Error checking blog generation status:', error);
          
          if (errorCountRef.current >= MAX_ERROR_COUNT) {
            toast.error('Impossible de suivre l\'avancement. Vérifiez l\'article manuellement.', {
              action: {
                label: 'Voir l\'article',
                onClick: () => navigate(`/admin/shops/${activeGeneration.shopId}/blog/${activeGeneration.postId}`)
              }
            });
            cleanup();
          }
          return;
        }

        if (data) {
          errorCountRef.current = 0; // Reset on success
          handleCompletion(data.generation_status);
        }
      } catch (err) {
        console.error('Status check failed:', err);
      }
    };

    // Setup realtime subscription
    const channel = supabase
      .channel(`blog_post_${activeGeneration.postId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'blog_posts',
          filter: `id=eq.${activeGeneration.postId}`
        },
        (payload: any) => {
          console.log('🔔 Realtime blog post update:', payload.new);
          if (payload.new?.generation_status) {
            const newStatus = payload.new.generation_status;
            
            // Add 500ms delay to ensure all updates are propagated before clearing banner
            if (newStatus === 'draft' || newStatus === 'published') {
              console.log('✅ Blog generation completed via realtime');
              setTimeout(() => {
                handleCompletion(newStatus);
              }, 500);
            } else if (newStatus === 'error') {
              console.log('❌ Blog generation failed via realtime');
              setTimeout(() => {
                handleCompletion(newStatus);
              }, 500);
            } else {
              handleCompletion(newStatus);
            }
          }
        }
      )
      .subscribe();
    
    channelRef.current = channel;

    // Initial check
    checkStatus();

    // Poll every 2 seconds as fallback (improved responsiveness)
    pollInterval = setInterval(checkStatus, 2000);

    // TTL: Auto-cleanup after 12 minutes
    ttlTimeout = setTimeout(() => {
      const elapsed = Date.now() - activeGeneration.startedAt;
      if (elapsed > MAX_GENERATION_TIME) {
        toast.info('Génération non confirmée après 12 min. Vérifiez l\'article manuellement.', {
          duration: 6000,
          action: {
            label: 'Voir l\'article',
            onClick: () => navigate(`/admin/shops/${activeGeneration.shopId}/blog/${activeGeneration.postId}`)
          }
        });
        cleanup();
      }
    }, MAX_GENERATION_TIME);

    return cleanup;
  }, [activeGeneration, navigate]);

  if (!activeGeneration || hidden) return null;

  const elapsed = Math.floor((Date.now() - activeGeneration.startedAt) / 1000);
  const estimatedTotal = 90; // 90 seconds estimated
  const progress = Math.min((elapsed / estimatedTotal) * 100, 95);

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <Card className="bg-card border shadow-lg">
        <div className="p-4">
          <div className="flex items-start gap-3">
            {status === 'generating' ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">
                  {activeGeneration.title}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHidden(true)}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground mb-2">
                Génération en cours… (~{Math.max(0, estimatedTotal - elapsed)}s restantes)
              </p>
              
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-1.5 mb-3">
                <div 
                  className="bg-primary h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigate(`/admin/shops/${activeGeneration.shopId}/blog/${activeGeneration.postId}`);
                    setHidden(true);
                  }}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Voir l'article
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
