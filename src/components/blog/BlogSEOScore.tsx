import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { SEOOptimizationModal } from './SEOOptimizationModal';

interface SEOScoreProps {
  postId: string;
  shopId: string;
  formData?: any;
  onOptimizationApplied?: (updates: any) => void;
}

interface CategoryAnalysis {
  score: number;
  max: number;
  issues: string[];
  recommendations: string[];
}

interface SEOAnalysis {
  score: number;
  categories: {
    content: CategoryAnalysis;
    keywords: CategoryAnalysis;
    metadata: CategoryAnalysis;
    media: CategoryAnalysis;
    links: CategoryAnalysis;
    advanced: CategoryAnalysis;
  };
  summary: string;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
}

export function BlogSEOScore({ postId, shopId, formData, onOptimizationApplied }: SEOScoreProps) {
  const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState<string | null>(null);
  const [optimizationData, setOptimizationData] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [scoreBefore, setScoreBefore] = useState<number | null>(null);

  const analyzePost = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-blog-seo', {
        body: { 
          postId,
          formContent: formData // Analyser le contenu du formulaire si disponible
        }
      });

      if (error) throw error;

      setAnalysis(data);
      toast.success('Analyse SEO terminée');
    } catch (error) {
      console.error('Error analyzing SEO:', error);
      toast.error('Erreur lors de l\'analyse SEO');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async (category: string) => {
    setOptimizing(category);
    // Save current score before optimization
    if (analysis) {
      setScoreBefore(analysis.score);
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('optimize-blog-seo', {
        body: { 
          postId, 
          category,
          seoAnalysis: analysis
        }
      });

      if (error) throw error;

      setOptimizationData(data);
      setShowModal(true);
    } catch (error: any) {
      console.error('Error optimizing:', error);
      toast.error(error.message || 'Erreur lors de l\'optimisation');
    } finally {
      setOptimizing(null);
    }
  };

  const handleApplyOptimization = async (optimizations: any) => {
    if (onOptimizationApplied) {
      // Prepare updates based on what was optimized
      const updates: any = {};
      
      // Helper pour nettoyer et tronquer
      const cleanAndTruncate = (text: string, maxLength: number): string => {
        if (!text) return '';
        let clean = text.replace(/<[^>]*>/g, '').trim();
        if (clean.length > maxLength) {
          clean = clean.substring(0, maxLength);
          const lastSpace = clean.lastIndexOf(' ');
          if (lastSpace > maxLength - 20) {
            clean = clean.substring(0, lastSpace);
          }
          clean = clean.trim();
        }
        return clean;
      };
      
      if (optimizations.meta_title) {
        updates.meta_title = cleanAndTruncate(optimizations.meta_title, 60);
      }
      if (optimizations.meta_description) {
        updates.meta_description = cleanAndTruncate(optimizations.meta_description, 160);
      }
      if (optimizations.content) updates.content = optimizations.content;
      if (optimizations.faq_html) {
        // Append FAQ to existing content
        updates.content = (optimizations.content || '') + '\n\n' + optimizations.faq_html;
      }
      
      onOptimizationApplied(updates);
      
      // Save optimization history
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase.from('seo_optimization_history').insert({
          post_id: postId,
          shop_id: shopId,
          optimization_type: optimizationData?.category || 'unknown',
          score_before: scoreBefore,
          score_after: null, // Will be updated after re-analysis
          changes_applied: optimizations,
          applied_by: user?.id
        });
      } catch (error) {
        console.error('Error saving optimization history:', error);
      }
      
      toast.success('✨ Optimisations appliquées ! N\'oubliez pas de sauvegarder.');
      
      // Reset analysis to force re-analysis
      setAnalysis(null);
      setScoreBefore(null);
    }
  };

  const regenerateArticle = async () => {
    setOptimizing('full');
    
    try {
      // Récupérer l'article actuel pour contexte
      const { data: post } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (!post) throw new Error('Article non trouvé');

      toast.info('🔄 Régénération complète de l\'article en cours...');

      // Appeler generate-blog-post avec contexte (avec retries)
      const invokeGenerate = async () => {
        return await supabase.functions.invoke('generate-blog-post', {
          body: { 
            shopId: shopId,
            topic: post.title,
            keywords: post.focus_keyword ? [post.focus_keyword] : [],
            existingContent: post.content,
            mode: 'regenerate',
            analyzeCompetitors: true
          }
        });
      };

      let data: any, error: any;
      const maxRetries = 2;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const res = await invokeGenerate();
        data = res.data; error = res.error;
        if (!error) break;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }

      if (error) throw error;

      // Appliquer toutes les modifications avec nettoyage des metas
      if (onOptimizationApplied) {
        const generated = (data && (data as any).post) ? (data as any).post : (data as any);
        
        // Helper pour nettoyer et tronquer
        const cleanAndTruncate = (text: string, maxLength: number): string => {
          if (!text) return '';
          let clean = text.replace(/<[^>]*>/g, '').trim();
          if (clean.length > maxLength) {
            clean = clean.substring(0, maxLength);
            const lastSpace = clean.lastIndexOf(' ');
            if (lastSpace > maxLength - 20) {
              clean = clean.substring(0, lastSpace);
            }
            clean = clean.trim();
          }
          return clean;
        };
        
        onOptimizationApplied({
          title: generated.title,
          content: generated.content,
          meta_title: cleanAndTruncate(generated.seo_title || generated.meta_title, 60),
          meta_description: cleanAndTruncate(generated.meta_description, 160),
          excerpt: generated.excerpt,
          focus_keyword: generated.focus_keyword,
          featured_image: generated.featured_image || formData?.featured_image
        });
      }

      // Sauvegarder l'historique
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase.from('seo_optimization_history').insert({
          post_id: postId,
          shop_id: shopId,
          optimization_type: 'full_regeneration',
          score_before: analysis?.score || null,
          score_after: null,
            changes_applied: {
              type: 'regeneration',
              oldContent: post.content.substring(0, 200) + '...',
              newContent: ((data && (data as any).post ? (data as any).post.content : (data as any)?.content) || '').substring(0, 200) + '...'
            },
          applied_by: user?.id
        });
      } catch (error) {
        console.error('Error saving optimization history:', error);
      }

      toast.success('✨ Article complètement régénéré ! N\'oubliez pas de sauvegarder.');
      
      // Réanalyser après un court délai
      setTimeout(() => {
        setAnalysis(null);
        analyzePost();
      }, 2000);
    } catch (error: any) {
      console.error('Erreur régénération:', error);
      toast.error(error.message || 'Erreur lors de la régénération');
    } finally {
      setOptimizing(null);
    }
  };

  const handleFullOptimization = async () => {
    if (!analysis) {
      // Pas d'analyse : régénération complète
      await regenerateArticle();
      return;
    }

    if (analysis.score <= 60) {
      // Score mauvais → régénération complète
      toast.info('Score trop faible, régénération complète de l\'article...');
      await regenerateArticle();
    } else {
      // Score correct → optimisation ciblée
      await handleOptimize('full');
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-green-500';
      case 'B':
        return 'bg-blue-500';
      case 'C':
        return 'bg-yellow-500';
      case 'D':
        return 'bg-orange-500';
      case 'F':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 90) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (percentage >= 70) return <Info className="h-5 w-5 text-blue-500" />;
    if (percentage >= 50) return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const categoryLabels: Record<string, string> = {
    content: 'Contenu',
    keywords: 'Mots-clés',
    metadata: 'Métadonnées',
    media: 'Médias',
    links: 'Liens',
    advanced: 'Fonctionnalités avancées'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Score SEO
        </CardTitle>
        <CardDescription>
          Analysez et optimisez le référencement de votre article
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!analysis ? (
          <div className="space-y-3">
            <Button onClick={analyzePost} disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Analyse en cours...' : 'Analyser le SEO'}
            </Button>
            <Button 
              onClick={handleFullOptimization} 
              disabled={optimizing === 'full'} 
              variant="outline"
              className="w-full"
            >
              {optimizing === 'full' ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Optimisation complète en cours...</>
              ) : (
                <>✨ Optimiser automatiquement (sans analyse)</>
              )}
            </Button>
          </div>
        ) : (
          <>
            {/* Overall Score */}
            <div className="flex items-center justify-between p-6 bg-secondary/20 rounded-lg">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="text-5xl font-bold">{analysis.score}</div>
                  <div className="text-muted-foreground">/100</div>
                  <Badge className={getGradeColor(analysis.grade)}>
                    {analysis.grade}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{analysis.summary}</p>
              </div>
              <Button variant="outline" size="sm" onClick={analyzePost} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Réanalyser'}
              </Button>
            </div>

            {/* Categories Breakdown */}
            <div className="space-y-4">
              <h3 className="font-semibold">Détails par catégorie</h3>
              <Accordion type="multiple" className="w-full">
                {Object.entries(analysis.categories).map(([key, category]) => {
                  const percentage = (category.score / category.max) * 100;
                  return (
                    <AccordionItem key={key} value={key}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-3">
                            {getCategoryIcon(category.score, category.max)}
                            <span className="font-medium">{categoryLabels[key]}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Progress value={percentage} className="w-24 h-2" />
                            <span className="text-sm font-semibold min-w-[4rem] text-right">
                              {category.score}/{category.max}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          {/* Issues */}
                          {category.issues.length > 0 && (
                            <Alert variant="destructive">
                              <XCircle className="h-4 w-4" />
                              <AlertDescription>
                                <ul className="list-disc list-inside space-y-1">
                                  {category.issues.map((issue, idx) => (
                                    <li key={idx} className="text-sm">{issue}</li>
                                  ))}
                                </ul>
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Recommendations */}
                          {category.recommendations.length > 0 && (
                            <Alert>
                              <Info className="h-4 w-4" />
                              <AlertDescription>
                                <div className="font-semibold mb-2">Recommandations :</div>
                                <ul className="list-disc list-inside space-y-1">
                                  {category.recommendations.map((rec, idx) => (
                                    <li key={idx} className="text-sm">{rec}</li>
                                  ))}
                                </ul>
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Perfect score */}
                          {category.issues.length === 0 && category.recommendations.length === 0 && (
                            <Alert>
                              <CheckCircle2 className="h-4 w-4" />
                              <AlertDescription>
                                Parfait ! Cette catégorie est parfaitement optimisée.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Améliorez rapidement votre score :
                </p>
                <Button 
                  size="sm"
                  onClick={handleFullOptimization}
                  disabled={optimizing === 'full'}
                >
                  {optimizing === 'full' ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> 
                    {!analysis || analysis.score <= 60 ? 'Régénération...' : 'Optimisation...'}</>
                  ) : (
                    <>✨ {!analysis || analysis.score <= 60 ? 'Régénérer l\'article' : 'Tout optimiser'}</>
                  )}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {analysis.score < 85 && (
                  <>
                    {analysis.categories.metadata.score < analysis.categories.metadata.max * 0.8 && (
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => handleOptimize('metadata')}
                      >
                        {optimizing === 'metadata' ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Optimisation...</>
                        ) : (
                          <>✨ Optimiser les métadonnées</>
                        )}
                      </Badge>
                    )}
                    {analysis.categories.keywords.score < analysis.categories.keywords.max * 0.8 && (
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => handleOptimize('keywords')}
                      >
                        {optimizing === 'keywords' ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Optimisation...</>
                        ) : (
                          <>✨ Améliorer les mots-clés</>
                        )}
                      </Badge>
                    )}
                    {analysis.categories.content.score < analysis.categories.content.max * 0.8 && (
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => handleOptimize('content')}
                      >
                        {optimizing === 'content' ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Optimisation...</>
                        ) : (
                          <>✨ Améliorer le contenu</>
                        )}
                      </Badge>
                    )}
                    {analysis.categories.links.score < analysis.categories.links.max * 0.8 && (
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => handleOptimize('links')}
                      >
                        {optimizing === 'links' ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Optimisation...</>
                        ) : (
                          <>✨ Enrichir les liens</>
                        )}
                      </Badge>
                    )}
                    {analysis.categories.advanced.score < analysis.categories.advanced.max * 0.8 && (
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => handleOptimize('faq')}
                      >
                        {optimizing === 'faq' ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Optimisation...</>
                        ) : (
                          <>✨ Ajouter une FAQ</>
                        )}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>

            <SEOOptimizationModal
              open={showModal}
              onClose={() => setShowModal(false)}
              onApply={handleApplyOptimization}
              data={optimizationData}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
