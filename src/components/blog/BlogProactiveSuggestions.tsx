import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, TrendingDown, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { differenceInDays } from "date-fns";

interface ProactiveSuggestion {
  postId: string;
  postTitle: string;
  reason: string;
  type: 'old_content' | 'low_score' | 'no_optimization';
  priority: 'high' | 'medium' | 'low';
}

interface BlogProactiveSuggestionsProps {
  shopId: string;
}

export function BlogProactiveSuggestions({ shopId }: BlogProactiveSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    analyzePosts();
  }, [shopId]);

  const analyzePosts = async () => {
    try {
      // Fetch all blog posts with their last optimization date
      const { data: posts, error } = await supabase
        .from('blog_posts')
        .select(`
          id,
          title,
          created_at,
          updated_at,
          status
        `)
        .eq('shop_id', shopId)
        .eq('status', 'publish')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const newSuggestions: ProactiveSuggestion[] = [];

      for (const post of posts || []) {
        // Check if post is older than 6 months
        const daysSinceCreation = differenceInDays(new Date(), new Date(post.created_at));
        const daysSinceUpdate = differenceInDays(new Date(), new Date(post.updated_at));

        // Check if post has optimization history
        const { data: history } = await supabase
          .from('seo_optimization_history')
          .select('id')
          .eq('post_id', post.id)
          .limit(1);

        // Old content that hasn't been updated
        if (daysSinceCreation > 180 && daysSinceUpdate > 90) {
          newSuggestions.push({
            postId: post.id,
            postTitle: post.title,
            reason: `Article publié il y a ${Math.floor(daysSinceCreation / 30)} mois - mise à jour recommandée`,
            type: 'old_content',
            priority: daysSinceCreation > 365 ? 'high' : 'medium'
          });
        }

        // No optimization history
        if (!history || history.length === 0) {
          newSuggestions.push({
            postId: post.id,
            postTitle: post.title,
            reason: 'Jamais optimisé - optimisation SEO recommandée',
            type: 'no_optimization',
            priority: 'medium'
          });
        }
      }

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      newSuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      setSuggestions(newSuggestions.slice(0, 5)); // Show top 5
    } catch (error) {
      console.error('Error analyzing posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'old_content':
        return <Clock className="w-4 h-4" />;
      case 'low_score':
        return <TrendingDown className="w-4 h-4" />;
      case 'no_optimization':
        return <Sparkles className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  if (loading || suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Suggestions d'optimisation
        </CardTitle>
        <CardDescription>
          Articles qui mériteraient une attention SEO
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.postId}
              className="flex items-start justify-between p-3 border rounded-lg bg-background hover:bg-secondary/5 transition-colors"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(suggestion.priority)}>
                    {suggestion.priority}
                  </Badge>
                  {getTypeIcon(suggestion.type)}
                  <span className="font-medium text-sm">{suggestion.postTitle}</span>
                </div>
                <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/admin/shops/${shopId}/blog/${suggestion.postId}`)}
              >
                Optimiser
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
