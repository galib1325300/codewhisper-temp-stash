import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Network, FileText, Link2, Sparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ClusterGenerationModal } from './ClusterGenerationModal';
import { ClusterArticleGenerator } from './ClusterArticleGenerator';

interface TopicCluster {
  id: string;
  name: string;
  pillar_keyword: string;
  pillar_post_id?: string;
  description?: string;
  target_keywords: string[];
  status: string;
  cluster_posts_count?: number;
  pillar_post_title?: string;
  auto_generated?: boolean;
  suggested_article_count?: number;
  remaining_articles?: number;
}

interface TopicClustersManagementProps {
  shopId: string;
}

export default function TopicClustersManagement({ shopId }: TopicClustersManagementProps) {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<TopicCluster[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<TopicCluster | null>(null);
  const [generationModalOpen, setGenerationModalOpen] = useState(false);
  const [articleGeneratorOpen, setArticleGeneratorOpen] = useState(false);
  const [selectedClusterForGeneration, setSelectedClusterForGeneration] = useState<TopicCluster | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    pillar_keyword: '',
    pillar_post_id: '',
    description: '',
    target_keywords: ''
  });

  useEffect(() => {
    loadData();
  }, [shopId]);

  const loadData = async () => {
    try {
      await Promise.all([loadClusters(), loadPosts()]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadClusters = async () => {
    const { data, error } = await supabase
      .from('topic_clusters')
      .select(`
        *,
        blog_posts!topic_clusters_pillar_post_id_fkey(title)
      `)
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Count posts in each cluster
    const clustersWithCounts = await Promise.all(
      (data || []).map(async (cluster) => {
        const { count } = await supabase
          .from('blog_posts')
          .select('*', { count: 'exact', head: true })
          .eq('cluster_id', cluster.id);

        return {
          ...cluster,
          target_keywords: Array.isArray(cluster.target_keywords) ? cluster.target_keywords : [],
          cluster_posts_count: count || 0,
          pillar_post_title: cluster.blog_posts?.title,
          remaining_articles: Math.max(0, (cluster.suggested_article_count || 0) - (count || 0))
        } as TopicCluster;
      })
    );

    setClusters(clustersWithCounts);
  };

  const handleGenerateArticles = (cluster: TopicCluster) => {
    setSelectedClusterForGeneration(cluster);
    setArticleGeneratorOpen(true);
  };

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, status')
      .eq('shop_id', shopId)
      .order('title');

    if (error) throw error;
    setPosts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const clusterData = {
        shop_id: shopId,
        name: formData.name,
        pillar_keyword: formData.pillar_keyword,
        pillar_post_id: formData.pillar_post_id || null,
        description: formData.description || null,
        target_keywords: formData.target_keywords.split(',').map(k => k.trim()).filter(Boolean)
      };

      if (editingCluster) {
        const { error } = await supabase
          .from('topic_clusters')
          .update(clusterData)
          .eq('id', editingCluster.id);
        
        if (error) throw error;
        toast.success('Cluster mis à jour');
      } else {
        const { error } = await supabase
          .from('topic_clusters')
          .insert([clusterData]);
        
        if (error) throw error;
        toast.success('Cluster créé');
      }

      setIsDialogOpen(false);
      resetForm();
      loadClusters();
    } catch (error) {
      console.error('Error saving cluster:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (cluster: TopicCluster) => {
    setEditingCluster(cluster);
    setFormData({
      name: cluster.name,
      pillar_keyword: cluster.pillar_keyword,
      pillar_post_id: cluster.pillar_post_id || '',
      description: cluster.description || '',
      target_keywords: cluster.target_keywords.join(', ')
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce cluster ? Les articles seront conservés mais déliés.')) return;

    try {
      const { error } = await supabase
        .from('topic_clusters')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Cluster supprimé');
      loadClusters();
    } catch (error) {
      console.error('Error deleting cluster:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setEditingCluster(null);
    setFormData({
      name: '',
      pillar_keyword: '',
      pillar_post_id: '',
      description: '',
      target_keywords: ''
    });
  };

  if (loading) {
    return <div className="text-center py-8">Chargement des clusters...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Topic Clusters</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organisez votre contenu en clusters thématiques pour un SEO optimal
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setGenerationModalOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Générer des clusters automatiquement
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau cluster
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCluster ? 'Modifier le cluster' : 'Nouveau cluster thématique'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nom du cluster *</label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Guide complet du SEO"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mot-clé pilier *</label>
                <Input
                  required
                  value={formData.pillar_keyword}
                  onChange={(e) => setFormData({...formData, pillar_keyword: e.target.value})}
                  placeholder="Ex: SEO pour e-commerce"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Décrivez l'objectif de ce cluster..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mots-clés secondaires</label>
                <Input
                  value={formData.target_keywords}
                  onChange={(e) => setFormData({...formData, target_keywords: e.target.value})}
                  placeholder="optimisation seo, référencement naturel, stratégie seo (séparés par virgules)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Article pilier (optionnel)</label>
                <select
                  value={formData.pillar_post_id}
                  onChange={(e) => setFormData({...formData, pillar_post_id: e.target.value})}
                  className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background"
                >
                  <option value="">Aucun article pilier</option>
                  {posts.map((post) => (
                    <option key={post.id} value={post.id}>
                      {post.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  L'article principal qui servira de pilier pour ce cluster
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  {editingCluster ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {clusters.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun cluster créé</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Créez des topic clusters pour organiser votre stratégie de contenu SEO
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer le premier cluster
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clusters.map((cluster) => (
            <Card key={cluster.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Network className="h-5 w-5 text-primary" />
                      {cluster.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {cluster.auto_generated && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Auto
                        </Badge>
                      )}
                      <Badge variant="secondary" className="font-mono">
                        {cluster.pillar_keyword}
                      </Badge>
                      <Badge variant="outline">
                        {cluster.cluster_posts_count} article{cluster.cluster_posts_count > 1 ? 's' : ''}
                      </Badge>
                      {cluster.remaining_articles! > 0 && (
                        <Badge variant="default" className="bg-orange-500/10 text-orange-700 dark:text-orange-400">
                          {cluster.remaining_articles} restants
                        </Badge>
                      )}
                      {cluster.status === 'active' && (
                        <Badge className="bg-green-500">Actif</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {cluster.remaining_articles! > 0 && (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => handleGenerateArticles(cluster)}
                        className="bg-primary"
                      >
                        <Zap className="h-4 w-4 mr-1" />
                        Générer articles
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/admin/shops/${shopId}/blog?cluster=${cluster.id}`)}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEdit(cluster)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(cluster.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {cluster.description && (
                  <p className="text-sm text-muted-foreground">{cluster.description}</p>
                )}

                {cluster.pillar_post_title && (
                  <div className="flex items-center gap-2 text-sm">
                    <Link2 className="h-4 w-4 text-primary" />
                    <span className="font-medium">Article pilier:</span>
                    <span className="text-muted-foreground">{cluster.pillar_post_title}</span>
                  </div>
                )}

                {cluster.target_keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {cluster.target_keywords.map((keyword, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClusterGenerationModal
        isOpen={generationModalOpen}
        onClose={() => setGenerationModalOpen(false)}
        shopId={shopId}
        onClustersCreated={loadClusters}
      />

      {selectedClusterForGeneration && (
        <ClusterArticleGenerator
          isOpen={articleGeneratorOpen}
          onClose={() => {
            setArticleGeneratorOpen(false);
            setSelectedClusterForGeneration(null);
          }}
          clusterId={selectedClusterForGeneration.id}
          clusterName={selectedClusterForGeneration.name}
          shopId={shopId}
          articleCount={selectedClusterForGeneration.remaining_articles || 6}
          onComplete={loadClusters}
        />
      )}
    </div>
  );
}
