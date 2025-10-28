import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import ShopNavigation from '../components/ShopNavigation';
import Button from '../components/Button';
import { getShopById } from '../utils/shops';
import { SEOContentService } from '../utils/seoContent';
import { Shop } from '../utils/types';
import { FileText, Plus, Edit, Trash2, Calendar, Search, AlertTriangle, Settings, Lightbulb, Users, Network, X, CheckSquare, Square, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import TopicSuggestionsModal from '../components/blog/TopicSuggestionsModal';
import AuthorManagement from '../components/blog/AuthorManagement';
import TopicClustersManagement from '../components/blog/TopicClustersManagement';
import { BlogProactiveSuggestions } from '../components/blog/BlogProactiveSuggestions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export default function ShopBlogPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const clusterId = searchParams.get('cluster');
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [activeCluster, setActiveCluster] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [formData, setFormData] = useState({
    topic: '',
    keywords: '',
    collectionIds: [] as string[],
    analyzeCompetitors: true
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [wpCredentialsConfigured, setWpCredentialsConfigured] = useState(false);
  const [collections, setCollections] = useState<any[]>([]);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [nicheData, setNicheData] = useState<{
    niche?: string;
    mainCategories?: string[];
    analyzedProducts?: number;
    analyzedCollections?: number;
  }>({});
  const [authors, setAuthors] = useState<any[]>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>('');
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);

  useEffect(() => {
    const loadShop = async () => {
      if (!id) return;
      
      try {
        const shopData = await getShopById(id);
        setShop(shopData);
        
        // Vérifier si credentials WordPress configurés
        const hasWpCredentials = !!(shopData?.wpUsername && shopData?.wpPassword);
        setWpCredentialsConfigured(hasWpCredentials);
        
        if (shopData) {
          loadBlogPosts();
          loadCollections();
          loadAuthors();
          if (clusterId) {
            loadCluster();
          }
        }
      } catch (error) {
        console.error('Error loading shop:', error);
      } finally {
        setLoading(false);
      }
    };

    loadShop();
  }, [id, clusterId]);

  const loadCluster = async () => {
    if (!clusterId) {
      setActiveCluster(null);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('topic_clusters')
        .select('*')
        .eq('id', clusterId)
        .single();
      
      if (error) throw error;
      
      // Count posts in this cluster
      const { count } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('cluster_id', clusterId);
      
      setActiveCluster({
        ...data,
        posts_count: count || 0,
        target_keywords: Array.isArray(data.target_keywords) ? data.target_keywords : []
      });
    } catch (error) {
      console.error('Error loading cluster:', error);
      toast.error('Erreur lors du chargement du cluster');
    }
  };

  const loadBlogPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('shop_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlogPosts(data || []);
    } catch (error) {
      console.error('Error loading blog posts:', error);
    }
  };

  const loadCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('id, name, slug')
        .eq('shop_id', id)
        .order('name');

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  const loadAuthors = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_authors')
        .select('*')
        .eq('shop_id', id)
        .order('name');

      if (error) throw error;
      setAuthors(data || []);
    } catch (error) {
      console.error('Error loading authors:', error);
    }
  };

  const handleSyncPosts = async () => {
    if (!shop) return;
    
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-wordpress-posts', {
        body: { shopId: shop.id }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        loadBlogPosts();
      } else {
        toast.error(data.error || 'Erreur lors de la synchronisation');
      }
    } catch (error) {
      toast.error('Erreur lors de la synchronisation des articles');
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleSuggestTopics = async () => {
    if (!shop) return;
    
    setShowSuggestionsModal(true);
    setLoadingSuggestions(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('suggest-blog-topics', {
        body: { shopId: shop.id }
      });

      if (error) throw error;

      if (data.success && data.suggestions) {
        setSuggestions(data.suggestions);
        setNicheData({
          niche: data.niche,
          mainCategories: data.main_categories,
          analyzedProducts: data.analyzed_products,
          analyzedCollections: data.analyzed_collections,
        });
        toast.success(`${data.suggestions.length} suggestions générées pour votre niche !`);
      } else {
        const errorMessage = data.error || 'Erreur lors de la génération des suggestions';
        toast.error(errorMessage, { duration: 8000 });
        
        // Show additional help for credits error
        if (errorMessage.includes('Crédits Lovable AI')) {
          setTimeout(() => {
            toast.info('💡 Rechargez vos crédits dans Settings → Workspace → Usage', { duration: 10000 });
          }, 500);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur lors de la génération des suggestions';
      toast.error(errorMsg, { duration: 8000 });
      console.error('Suggestions error:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSelectTopic = (topic: string, keywords: string) => {
    setFormData({ ...formData, topic, keywords });
    setShowSuggestionsModal(false);
    setShowForm(true);
    toast.success('Sujet sélectionné ! Vous pouvez maintenant personnaliser et générer l\'article.');
  };

  const handleGeneratePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !formData.topic) {
      toast.error('Veuillez renseigner un sujet pour l\'article');
      return;
    }
    
    setGenerating(true);
    try {
      const keywords = formData.keywords.split(',').map(k => k.trim()).filter(k => k);
      
      const { data, error } = await supabase.functions.invoke('generate-blog-post', {
        body: {
          shopId: shop.id,
          topic: formData.topic,
          keywords,
          collectionIds: formData.collectionIds,
          analyzeCompetitors: formData.analyzeCompetitors
        }
      });

      if (error) throw error;
      
      if (data.success && data.post) {
        toast.success('Article SEO optimisé généré avec succès !');
        setShowForm(false);
        setFormData({ topic: '', keywords: '', collectionIds: [], analyzeCompetitors: true });
        loadBlogPosts();
      } else {
        toast.error(data.error || 'Erreur lors de la génération');
      }
    } catch (error) {
      toast.error('Erreur lors de la génération de l\'article');
      console.error('Generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return badges[status as keyof typeof badges] || badges.draft;
  };

  const handleSelectAll = () => {
    const filteredPosts = blogPosts.filter(post => {
      if (activeCluster && post.cluster_id !== activeCluster.id) return false;
      if (searchQuery) {
        return post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
    
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(filteredPosts.map(p => p.id));
    }
  };

  const handleTogglePost = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPosts.includes(postId)) {
      setSelectedPosts(selectedPosts.filter(id => id !== postId));
    } else {
      setSelectedPosts([...selectedPosts, postId]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPosts.length === 0) return;
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedPosts.length} article(s) ?`)) return;
    
    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .in('id', selectedPosts);
      
      if (error) throw error;
      
      toast.success(`${selectedPosts.length} article(s) supprimé(s)`);
      setSelectedPosts([]);
      loadBlogPosts();
    } catch (error) {
      console.error('Error deleting posts:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleBulkRegenerate = async () => {
    if (selectedPosts.length === 0) return;
    
    if (!confirm(`Voulez-vous régénérer ${selectedPosts.length} article(s) ? Cette action peut prendre plusieurs minutes.`)) return;
    
    toast.info(`Régénération de ${selectedPosts.length} article(s) en cours...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const postId of selectedPosts) {
      try {
        const post = blogPosts.find(p => p.id === postId);
        if (!post) continue;
        
        const { data, error } = await supabase.functions.invoke('generate-blog-post', {
          body: {
            shopId: shop?.id,
            topic: post.title,
            keywords: post.focus_keyword ? [post.focus_keyword] : [],
            collectionIds: [],
            analyzeCompetitors: false,
            postId: postId // Pour mettre à jour l'article existant
          }
        });
        
        if (error) throw error;
        
        if (data.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`Error regenerating post ${postId}:`, error);
        errorCount++;
      }
    }
    
    setSelectedPosts([]);
    loadBlogPosts();
    
    if (successCount > 0) {
      toast.success(`${successCount} article(s) régénéré(s) avec succès`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} article(s) ont échoué`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Boutique non trouvée</h2>
          <p className="mt-2 text-gray-600">La boutique que vous recherchez n'existe pas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <ShopNavigation shopName={shop.name} />
            
            {!wpCredentialsConfigured && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-amber-900 mb-2">
                      Configuration WordPress requise pour accéder au blog
                    </h3>
                    <p className="text-sm text-amber-800 mb-3">
                      Pour gérer les articles de blog WordPress, vous devez configurer un 
                      <strong> mot de passe d'application WordPress</strong> dans les paramètres de la boutique.
                    </p>
                    <p className="text-sm text-amber-800 mb-3">
                      Les credentials WooCommerce (Consumer Key/Secret) ne suffisent pas pour accéder 
                      à l'API WordPress Posts (<code>wp/v2/posts</code>).
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/admin/shops/${id}/settings`)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Aller aux paramètres
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-white rounded-lg shadow-sm">
              <Tabs defaultValue="articles" className="w-full">
                <TabsList className="m-6 mb-0">
                  <TabsTrigger value="articles">
                    <FileText className="w-4 h-4 mr-2" />
                    Articles
                  </TabsTrigger>
                  <TabsTrigger value="clusters">
                    <Network className="w-4 h-4 mr-2" />
                    Topic Clusters
                  </TabsTrigger>
                  <TabsTrigger value="personas">
                    <Users className="w-4 h-4 mr-2" />
                    Personas E-E-A-T
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="articles" className="m-0">
                  {activeCluster && (
                    <Card className="m-6 mb-0 p-4 bg-primary/5 border-primary/20">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Network className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold text-foreground">
                              Cluster : {activeCluster.name}
                            </h3>
                            <Badge variant="secondary" className="font-mono">
                              {activeCluster.pillar_keyword}
                            </Badge>
                          </div>
                          {activeCluster.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {activeCluster.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm text-muted-foreground">
                              📊 {activeCluster.posts_count} article{activeCluster.posts_count > 1 ? 's' : ''}
                            </span>
                            {activeCluster.target_keywords && activeCluster.target_keywords.length > 0 && (
                              <span className="text-sm text-muted-foreground">
                                🎯 {activeCluster.target_keywords.slice(0, 3).join(', ')}
                                {activeCluster.target_keywords.length > 3 && ` +${activeCluster.target_keywords.length - 3}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSearchParams({});
                            setActiveCluster(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* Proactive SEO Suggestions */}
                  {!activeCluster && shop && (
                    <div className="m-6 mb-0">
                      <BlogProactiveSuggestions shopId={shop.id} />
                    </div>
                  )}
                  
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {activeCluster ? `Articles du cluster "${activeCluster.name}"` : 'Articles de blog'}
                      </h2>
                      <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Rechercher un article..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <Button 
                      variant="secondary"
                      onClick={handleSuggestTopics}
                    >
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Suggérer des sujets
                    </Button>
                    {wpCredentialsConfigured && (
                      <Button 
                        variant="secondary"
                        onClick={handleSyncPosts}
                        disabled={syncing}
                      >
                        {syncing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                            Synchronisation...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Synchroniser
                          </>
                        )}
                      </Button>
                    )}
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nouvel article SEO
                    </Button>
                    </div>
                  </div>
                </div>

                {/* Barre d'outils de sélection multiple */}
                {selectedPosts.length > 0 && (
                  <div className="mx-6 mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckSquare className="w-5 h-5 text-indigo-600" />
                      <span className="font-medium text-indigo-900">
                        {selectedPosts.length} article(s) sélectionné(s)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleBulkRegenerate}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Régénérer
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleBulkDelete}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedPosts([])}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {showForm ? (
                  <form onSubmit={handleGeneratePost} className="max-w-2xl mx-auto space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Génération d'article 100% optimisé SEO
                      </h3>
                      <p className="text-sm text-blue-800">
                        Notre IA utilise les meilleures pratiques SEO : structure H1/H2/H3, mots-clés optimisés, 
                        meta descriptions, liens internes, et contenu 1200+ mots.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sujet de l'article *
                      </label>
                      <input
                        type="text"
                        value={formData.topic}
                        onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                        placeholder="Ex: Les avantages du dropshipping en 2025"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mots-clés SEO (séparés par des virgules)
                      </label>
                      <input
                        type="text"
                        value={formData.keywords}
                        onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                        placeholder="Ex: dropshipping, e-commerce, vente en ligne"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Le premier mot-clé sera utilisé comme mot-clé principal
                      </p>
                    </div>

                    <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-4">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.analyzeCompetitors}
                          onChange={(e) => setFormData({ ...formData, analyzeCompetitors: e.target.checked })}
                          className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-indigo-900">🔍 Analyser les concurrents Google</span>
                            <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full">Recommandé</span>
                          </div>
                          <p className="text-xs text-indigo-700 mt-1">
                            Analyse les top 3 résultats Google pour créer un article qui surpasse la concurrence. 
                            L'IA analysera leur structure, longueur, mots-clés et créera un contenu supérieur.
                          </p>
                        </div>
                      </label>
                    </div>

                    {collections.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Collections à mentionner dans l'article (optionnel)
                        </label>
                        <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
                          {collections.map((collection) => (
                            <label key={collection.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <input
                                type="checkbox"
                                checked={formData.collectionIds.includes(collection.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      collectionIds: [...formData.collectionIds, collection.id]
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      collectionIds: formData.collectionIds.filter(id => id !== collection.id)
                                    });
                                  }
                                }}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-700">{collection.name}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          L'IA créera des liens internes vers ces collections
                        </p>
                      </div>
                    )}

                    {authors.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Auteur de l'article (E-E-A-T)
                        </label>
                        <select
                          value={selectedAuthorId}
                          onChange={(e) => setSelectedAuthorId(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Aucun auteur</option>
                          {authors.map((author) => (
                            <option key={author.id} value={author.id}>
                              {author.name} - {author.title}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Associez un auteur expert pour renforcer la crédibilité E-E-A-T
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-4">
                      <Button
                        type="submit"
                        disabled={generating || !formData.topic}
                        className="flex-1"
                      >
                        {generating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Génération en cours...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Générer l'article optimisé SEO
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setShowForm(false);
                          setFormData({ topic: '', keywords: '', collectionIds: [], analyzeCompetitors: true });
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </form>
                ) : blogPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <FileText className="w-12 h-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Aucun article de blog
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {wpCredentialsConfigured 
                        ? "Synchronisez vos articles WordPress ou créez-en un nouveau avec l'IA"
                        : "Commencez par créer votre premier article optimisé SEO avec l'IA"
                      }
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      {wpCredentialsConfigured && (
                        <Button variant="secondary" onClick={handleSyncPosts} disabled={syncing}>
                          {syncing ? 'Synchronisation...' : 'Synchroniser WordPress'}
                        </Button>
                      )}
                      <Button onClick={() => setShowForm(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Générer un article SEO
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    {/* Checkbox "Tout sélectionner" */}
                    <div className="mb-4 flex items-center gap-2">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {selectedPosts.length === blogPosts.filter(post => {
                          if (activeCluster && post.cluster_id !== activeCluster.id) return false;
                          if (searchQuery) {
                            return post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                   post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
                          }
                          return true;
                        }).length && selectedPosts.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                        <span>Tout sélectionner</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                    {blogPosts
                      .filter(post => {
                        // Filter by cluster if active
                        if (activeCluster && post.cluster_id !== activeCluster.id) {
                          return false;
                        }
                        // Filter by search query
                        if (searchQuery) {
                          return post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
                        }
                        return true;
                      })
                      .map((post) => (
                        <div 
                          key={post.id} 
                          className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => navigate(`/admin/shops/${id}/blog/${post.id}`)}
                        >
                          <div className="flex items-start gap-4">
                            {/* Checkbox de sélection */}
                            <div 
                              className="mt-1"
                              onClick={(e) => handleTogglePost(post.id, e)}
                            >
                              {selectedPosts.includes(post.id) ? (
                                <CheckSquare className="w-5 h-5 text-indigo-600" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400 hover:text-indigo-600" />
                              )}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(post.status || 'draft')}`}>
                                  {post.status === 'published' ? 'Publié' : post.status === 'pending' ? 'En attente' : 'Brouillon'}
                                </span>
                                {post.seo_score && post.seo_score >= 80 && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                    SEO: {post.seo_score}/100
                                  </span>
                                )}
                              </div>
                              {post.excerpt && (
                                <p className="text-gray-600 text-sm mb-3 line-clamp-2"
                                   dangerouslySetInnerHTML={{ __html: post.excerpt }}
                                />
                              )}
                              {post.focus_keyword && (
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs text-gray-500">Mot-clé:</span>
                                  <span className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded">
                                    {post.focus_keyword}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(post.created_at || '')}
                                </span>
                                {post.external_id && (
                                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">WordPress</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/shops/${id}/blog/${post.id}`);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;
                                  try {
                                    await supabase.from('blog_posts').delete().eq('id', post.id);
                                    toast.success('Article supprimé');
                                    loadBlogPosts();
                                  } catch (error) {
                                    toast.error('Erreur lors de la suppression');
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="clusters">
                {id && <TopicClustersManagement shopId={id} />}
              </TabsContent>

              <TabsContent value="personas">
                {id && <AuthorManagement shopId={id} />}
              </TabsContent>
            </Tabs>
          </div>
        </div>
        </main>
      </div>

            <TopicSuggestionsModal
              isOpen={showSuggestionsModal}
              onClose={() => setShowSuggestionsModal(false)}
              suggestions={suggestions}
              loading={loadingSuggestions}
              onSelectTopic={handleSelectTopic}
              niche={nicheData.niche}
              mainCategories={nicheData.mainCategories}
              analyzedProducts={nicheData.analyzedProducts}
              analyzedCollections={nicheData.analyzedCollections}
            />
    </div>
  );
}