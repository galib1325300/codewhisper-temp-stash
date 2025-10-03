import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import ShopNavigation from '../components/ShopNavigation';
import SEOOptimizer from '../components/seo/SEOOptimizer';
import KeywordAnalyzer from '../components/seo/KeywordAnalyzer';
import AutomationRules from '../components/seo/AutomationRules';
import { 
  Wand2, 
  Search, 
  Zap, 
  TrendingUp,
  Target,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import LoadingState from '../components/ui/loading-state';

const SEOOptimizationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('optimizer');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    score: 0,
    keywordsCount: 0,
    automationsCount: 0,
    optimizationsCount: 0
  });

  useEffect(() => {
    if (id) {
      loadStats();
    }
  }, [id]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Get latest diagnostic
      const { data: diagnostic } = await supabase
        .from('seo_diagnostics')
        .select('score, total_issues')
        .eq('shop_id', id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Count tracked keywords
      const { count: keywordsCount } = await supabase
        .from('tracked_keywords')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', id);

      // Count automation rules
      const { count: automationsCount } = await supabase
        .from('automation_rules')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', id)
        .eq('status', 'active');

      setStats({
        score: diagnostic?.score || 0,
        keywordsCount: keywordsCount || 0,
        automationsCount: automationsCount || 0,
        optimizationsCount: diagnostic?.total_issues ? Math.max(0, 100 - diagnostic.total_issues) : 0
      });
    } catch (error) {
      console.error('Error loading SEO stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-7xl mx-auto px-4 py-8">
          <ShopNavigation shopName="Optimisation SEO" />
          <LoadingState text="Chargement des statistiques SEO..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <ShopNavigation shopName="Optimisation SEO" />
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl mr-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Optimisation SEO Avancée</h1>
              <p className="text-muted-foreground">
                Outils d'optimisation intelligents basés sur l'IA pour améliorer votre référencement
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="card-elevated">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Score SEO</p>
                    <p className={`text-2xl font-bold ${getScoreColor(stats.score)}`}>
                      {stats.score}/100
                    </p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-elevated">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Mots-clés suivis</p>
                    <p className="text-2xl font-bold text-primary">{stats.keywordsCount}</p>
                  </div>
                  <Search className="w-5 h-5 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-elevated">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Automatisations</p>
                    <p className="text-2xl font-bold text-info">{stats.automationsCount}</p>
                  </div>
                  <Zap className="w-5 h-5 text-info" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-elevated">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Optimisations</p>
                    <p className="text-2xl font-bold text-warning">{stats.optimizationsCount}</p>
                  </div>
                  <Target className="w-5 h-5 text-warning" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger 
              value="optimizer" 
              className="flex items-center space-x-2 data-[state=active]:bg-background"
            >
              <Wand2 className="w-4 h-4" />
              <span>Optimiseur IA</span>
            </TabsTrigger>
            <TabsTrigger 
              value="keywords" 
              className="flex items-center space-x-2 data-[state=active]:bg-background"
            >
              <Search className="w-4 h-4" />
              <span>Mots-clés</span>
            </TabsTrigger>
            <TabsTrigger 
              value="automation" 
              className="flex items-center space-x-2 data-[state=active]:bg-background"
            >
              <Zap className="w-4 h-4" />
              <span>Automatisation</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="optimizer" className="mt-6">
            <SEOOptimizer shopId={id} />
          </TabsContent>

          <TabsContent value="keywords" className="mt-6">
            <KeywordAnalyzer shopId={id} />
          </TabsContent>

          <TabsContent value="automation" className="mt-6">
            <AutomationRules shopId={id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SEOOptimizationPage;