import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, X, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LS_KEY = 'activeBlogGeneration';

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

  // Show banner again if user navigates away from detail page
  useEffect(() => {
    if (activeGeneration && location.pathname !== `/admin/shops/${activeGeneration.shopId}/blog/${activeGeneration.postId}`) {
      setHidden(false);
    }
  }, [location.pathname, activeGeneration]);

  // Poll for generation status
  useEffect(() => {
    if (!activeGeneration) return;

    let interval: NodeJS.Timeout;
    
    const checkStatus = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('generation_status, content')
        .eq('id', activeGeneration.postId)
        .single();

      if (error || !data) {
        console.error('Error checking blog generation status:', error);
        return;
      }

      setStatus(data.generation_status as any);

      // Check if completed
      if (data.generation_status === 'draft' || data.generation_status === 'published') {
        toast.success('✅ Article généré avec succès !');
        localStorage.removeItem(LS_KEY);
        setActiveGeneration(null);
      } else if (data.generation_status === 'error') {
        toast.error('❌ Erreur lors de la génération de l\'article');
        localStorage.removeItem(LS_KEY);
        setActiveGeneration(null);
      }
    };

    // Initial check
    checkStatus();

    // Poll every 3 seconds
    interval = setInterval(checkStatus, 3000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeGeneration]);

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
