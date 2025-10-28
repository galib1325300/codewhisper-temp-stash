import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Plus, Loader2, Eye, TrendingUp, Link as LinkIcon, Target, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import AdminNavbar from '@/components/AdminNavbar';
import AdminSidebar from '@/components/AdminSidebar';
import ShopNavigation from '@/components/ShopNavigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { ClusterGraph } from '@/components/blog/ClusterGraph';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TopicCluster {
  id: string;
  name: string;
  pillar_keyword: string;
  description: string;
  target_keywords: any;
  status: string;
  suggested_article_count: number;
}

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  created_at: string;
  focus_keyword: string;
  meta_description: string;
  content: string;
  featured_image?: string;
  is_pillar: boolean;
}

interface Shop {
  id: string;
  name: string;
  url: string;
  type: string;
}

export default function ClusterDetailPage() {
  const { id: shopId, clusterId } = useParams();
  const navigate = useNavigate();
  
  const [shop, setShop] = useState<Shop | null>(null);
  const [cluster, setCluster] = useState<TopicCluster | null>(null);
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [articleCount, setArticleCount] = useState('1');
  const [generatingMissing, setGeneratingMissing] = useState(false);

  useEffect(() => {
    loadData();
  }, [shopId, clusterId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load shop
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single();

      if (shopError) throw shopError;
      setShop(shopData);

      // Load cluster
      const { data: clusterData, error: clusterError } = await supabase
        .from('topic_clusters')
        .select('*')
        .eq('id', clusterId)
        .single();

      if (clusterError) throw clusterError;
      setCluster(clusterData);

      // Load articles
      const { data: articlesData, error: articlesError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('shop_id', shopId)
        .eq('cluster_id', clusterId)
        .order('created_at', { ascending: false });

      if (articlesError) throw articlesError;
      setArticles(articlesData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateArticles = async () => {
    if (!cluster) return;

    const count = parseInt(articleCount);
    if (isNaN(count) || count < 1) {
      toast.error('Veuillez entrer un nombre valide');
      return;
    }

    setGenerating(true);
    setShowGenerateDialog(false);

    try {
      const { data, error } = await supabase.functions.invoke('generate-cluster-articles', {
        body: {
          clusterId: cluster.id,
          shopId,
          count
        }
      });

      if (error) throw error;

      toast.success(`Génération de ${count} article(s) lancée !`);
      loadData();
    } catch (error) {
      console.error('Error generating articles:', error);
      toast.error('Erreur lors de la génération des articles');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline', label: string }> = {
      published: { variant: 'default', label: 'Publié' },
      draft: { variant: 'secondary', label: 'Brouillon' },
      pending: { variant: 'outline', label: 'En attente' }
    };
    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getWordCount = (content: string) => {
    const text = content.replace(/<[^>]*>/g, '');
    return text.split(/\s+/).filter(w => w.length > 0).length;
  };

  const handleGenerateMissingArticles = async () => {
    if (!cluster || missingCount === 0) return;

    setGeneratingMissing(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-cluster-articles', {
        body: {
          clusterId: cluster.id,
          shopId,
          count: missingCount
        }
      });

      if (error) throw error;

      toast.success(`Génération de ${missingCount} article(s) manquant(s) lancée !`);
      loadData();
    } catch (error) {
      console.error('Error generating missing articles:', error);
      toast.error('Erreur lors de la génération des articles');
    } finally {
      setGeneratingMissing(false);
    }
  };

  const calculateSEOStats = () => {
    if (articles.length === 0) return { avgScore: 0, totalLinks: 0, keywordCoverage: 0 };

    // Calculate average word count as SEO score proxy
    const avgWords = articles.reduce((sum, a) => sum + getWordCount(a.content || ''), 0) / articles.length;
    const avgScore = Math.min(100, Math.round((avgWords / 1200) * 100));

    // Count internal links
    const totalLinks = articles.reduce((sum, a) => {
      const matches = (a.content || '').match(/<a\s+href=/g);
      return sum + (matches?.length || 0);
    }, 0);

    // Calculate keyword coverage
    const articlesWithKeyword = articles.filter(a => a.focus_keyword).length;
    const keywordCoverage = Math.round((articlesWithKeyword / articles.length) * 100);

    return { avgScore, totalLinks, keywordCoverage };
  };

  const seoStats = calculateSEOStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNavbar />
        <div className="flex">
          <AdminSidebar />
          <main className="flex-1 p-8">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!shop || !cluster) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNavbar />
        <div className="flex">
          <AdminSidebar />
          <main className="flex-1 p-8">
            <p>Cluster non trouvé</p>
          </main>
        </div>
      </div>
    );
  }

  const missingCount = Math.max(0, cluster.suggested_article_count - articles.length);
  const progress = cluster.suggested_article_count > 0 
    ? Math.round((articles.length / cluster.suggested_article_count) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <ShopNavigation shopName={shop.name} />

          {/* Back button */}
          <Button
            variant="ghost"
            onClick={() => navigate(`/admin/shops/${shopId}/blog?tab=clusters`)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux Topic Clusters
          </Button>

          {/* SEO Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Score SEO Moyen</p>
                    <p className="text-3xl font-bold text-primary">{seoStats.avgScore}/100</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Liens Internes</p>
                    <p className="text-3xl font-bold text-primary">{seoStats.totalLinks}</p>
                  </div>
                  <LinkIcon className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Couverture Keywords</p>
                    <p className="text-3xl font-bold text-primary">{seoStats.keywordCoverage}%</p>
                  </div>
                  <Target className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cluster Header */}
          <Card className="mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">{cluster.name}</CardTitle>
                  <CardDescription className="text-base">
                    🎯 Mot-clé pilier : <strong>{cluster.pillar_keyword}</strong>
                  </CardDescription>
                  {cluster.description && (
                    <p className="text-sm text-muted-foreground mt-2">{cluster.description}</p>
                  )}
                  {cluster.target_keywords && cluster.target_keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {cluster.target_keywords.map((keyword: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Badge variant={cluster.status === 'active' ? 'default' : 'secondary'}>
                  {cluster.status === 'active' ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">{articles.length}</div>
                  <div className="text-sm text-muted-foreground">Articles créés</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-500">{missingCount}</div>
                  <div className="text-sm text-muted-foreground">À générer</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500">{progress}%</div>
                  <div className="text-sm text-muted-foreground">Progression</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowGenerateDialog(true)}
                  disabled={generating}
                  className="flex-1"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Générer des articles
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Missing Articles Section */}
          {missingCount > 0 && (
            <Card className="mb-6 border-orange-200 bg-orange-50/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-orange-500" />
                      Articles Manquants
                    </CardTitle>
                    <CardDescription>
                      {missingCount} article(s) suggéré(s) non encore créé(s)
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={handleGenerateMissingArticles}
                    disabled={generatingMissing}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {generatingMissing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Générer tous les manquants ({missingCount})
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: Math.min(missingCount, 6) }).map((_, idx) => (
                    <Card key={idx} className="border-dashed border-2 border-orange-300 bg-white">
                      <CardContent className="p-4 text-center">
                        <FileText className="h-8 w-8 mx-auto text-orange-400 mb-2" />
                        <p className="text-sm text-muted-foreground">Article à générer</p>
                      </CardContent>
                    </Card>
                  ))}
                  {missingCount > 6 && (
                    <Card className="border-dashed border-2 border-orange-300 bg-white">
                      <CardContent className="p-4 text-center flex items-center justify-center">
                        <p className="text-sm font-medium text-orange-600">+{missingCount - 6} autres</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content Tabs */}
          <Tabs defaultValue="list" className="space-y-4">
            <TabsList>
              <TabsTrigger value="list">
                <FileText className="h-4 w-4 mr-2" />
                Liste des articles
              </TabsTrigger>
              <TabsTrigger value="graph">
                <Target className="h-4 w-4 mr-2" />
                Visualisation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="graph">
              <Card>
                <CardHeader>
                  <CardTitle>Réseau du Cluster</CardTitle>
                  <CardDescription>
                    Visualisation des articles et leurs interconnexions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ClusterGraph 
                    articles={articles}
                    clusterName={cluster.name}
                    missingCount={missingCount}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list">
              <Card>
            <CardHeader>
              <CardTitle>Articles du cluster ({articles.length})</CardTitle>
              <CardDescription>
                Liste de tous les articles générés pour ce topic cluster
              </CardDescription>
            </CardHeader>
            <CardContent>
              {articles.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun article généré pour ce cluster</p>
                  <Button 
                    onClick={() => setShowGenerateDialog(true)}
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Générer le premier article
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {articles.map((article) => (
                    <Card key={article.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              {article.is_pillar && (
                                <Badge variant="default" className="bg-purple-500">
                                  📌 Pilier
                                </Badge>
                              )}
                              {getStatusBadge(article.status)}
                              {article.featured_image && (
                                <Badge variant="outline">🖼️ Image</Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-lg mb-1 truncate">
                              {article.title}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>📝 {getWordCount(article.content)} mots</span>
                              {article.focus_keyword && (
                                <span>🎯 {article.focus_keyword}</span>
                              )}
                              <span>📅 {new Date(article.created_at).toLocaleDateString('fr-FR')}</span>
                            </div>
                            {article.meta_description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {article.meta_description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/admin/shops/${shopId}/blog/${article.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Voir
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              </CardContent>
            </Card>
            </TabsContent>
          </Tabs>

          {/* Generate Dialog */}
          <AlertDialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Générer des articles</AlertDialogTitle>
                <AlertDialogDescription>
                  Combien d'articles souhaitez-vous générer pour ce cluster ?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Input
                  type="number"
                  min="1"
                  value={articleCount}
                  onChange={(e) => setArticleCount(e.target.value)}
                  placeholder="Nombre d'articles"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleGenerateArticles}>
                  Générer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </div>
    </div>
  );
}
