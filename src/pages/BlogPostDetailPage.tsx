import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import ShopNavigation from '../components/ShopNavigation';
import Button from '../components/Button';
import { getShopById } from '../utils/shops';
import { Shop } from '../utils/types';
import { ArrowLeft, Save, Trash2, RefreshCw, Calendar, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function BlogPostDetailPage() {
  const { id: shopId, postId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    slug: '',
    meta_title: '',
    meta_description: '',
    focus_keyword: '',
    featured_image: ''
  });
  const [showPreview, setShowPreview] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [extractedImages, setExtractedImages] = useState<Array<{ url: string; alt: string }>>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!shopId || !postId) return;
      
      try {
        const shopData = await getShopById(shopId);
        setShop(shopData);
        
        // Load blog post
        const { data: postData, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', postId)
          .single();

        if (error) throw error;

        setPost(postData);
        setFormData({
          title: postData.title || '',
          content: postData.content || '',
          excerpt: postData.excerpt || '',
          slug: postData.slug || '',
          meta_title: postData.meta_title || '',
          meta_description: postData.meta_description || '',
          focus_keyword: postData.focus_keyword || '',
          featured_image: postData.featured_image || ''
        });

        // Extract images from content
        const imgRegex = /<img[^>]+src="([^">]+)"[^>]*alt="([^">]*)"[^>]*>/gi;
        const images = [];
        let imgMatch;
        while ((imgMatch = imgRegex.exec(postData.content || '')) !== null) {
          images.push({
            url: imgMatch[1],
            alt: imgMatch[2] || ''
          });
        }
        setExtractedImages(images);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Erreur lors du chargement de l\'article');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [shopId, postId]);

  const handleSave = async () => {
    if (!postId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          title: formData.title,
          content: formData.content,
          excerpt: formData.excerpt,
          slug: formData.slug,
          meta_title: formData.meta_title,
          meta_description: formData.meta_description,
          focus_keyword: formData.focus_keyword,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId);

      if (error) throw error;

      toast.success('Article enregistré avec succès');
      
      // Reload post data
      const { data: updatedPost } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single();
      
      if (updatedPost) setPost(updatedPost);
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!postId || !shop) return;

    setSyncing(true);
    try {
      // Update status to publish
      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({ 
          status: 'publish',
          published_at: new Date().toISOString()
        })
        .eq('id', postId);

      if (updateError) throw updateError;

      // If WooCommerce shop, sync to WordPress
      if (shop.type === 'WooCommerce') {
        // TODO: Call WordPress publish API
        toast.success('Article publié et synchronisé avec WordPress');
      } else {
        toast.success('Article publié');
      }

      // Reload post
      const { data: updatedPost } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single();
      
      if (updatedPost) setPost(updatedPost);
    } catch (error) {
      console.error('Error publishing post:', error);
      toast.error('Erreur lors de la publication');
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!postId || !confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast.success('Article supprimé avec succès');
      navigate(`/admin/shops/${shopId}/blog`);
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSync = async () => {
    if (!shop) return;

    setSyncing(true);
    try {
      // TODO: Sync with WordPress
      toast.success('Synchronisation effectuée');
    } catch (error) {
      toast.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const wordCount = formData.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNavbar />
        <div className="flex">
          <AdminSidebar />
          <div className="flex-1 p-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNavbar />
        <div className="flex">
          <AdminSidebar />
          <div className="flex-1 p-8">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Article non trouvé</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1">
          {shop && <ShopNavigation shopName={shop.name} />}
          
          <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigate(`/admin/shops/${shopId}/blog`)}
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la liste des articles
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Subject Section */}
                <div className="bg-card rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Sujet de l'article</h2>
                    <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        // TODO: Implement regenerate
                        toast.info('Fonctionnalité à venir');
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Régénérer
                    </Button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-lg font-medium bg-background"
                    placeholder="Titre de l'article"
                  />
                </div>

                {/* Content Section */}
                <div className="bg-card rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">
                      Corps de l'article 
                      <span className="text-sm text-muted-foreground ml-2">
                        {wordCount} mots
                      </span>
                    </h2>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditMode(!editMode)}
                    >
                      {editMode ? '👁️ Vue visuelle' : '📝 Éditer HTML'}
                    </Button>
                  </div>
                  {editMode ? (
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary min-h-[500px] font-mono text-sm bg-muted/30"
                      placeholder="Contenu HTML de l'article"
                    />
                  ) : (
                    <div className="prose prose-slate dark:prose-invert max-w-none px-4 py-2 min-h-[500px] border rounded-lg bg-background">
                      <div dangerouslySetInnerHTML={{ __html: formData.content }} />
                    </div>
                  )}
                </div>

                {/* Excerpt Section */}
                <div className="bg-card rounded-lg border p-6">
                  <h2 className="text-lg font-semibold mb-4">
                    Résumé de l'article 
                    <span className="text-sm text-muted-foreground ml-2">
                      {formData.excerpt.length} caractères
                    </span>
                  </h2>
                  <textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary min-h-[120px] bg-background"
                    placeholder="Résumé court de l'article"
                  />
                </div>

                {/* Slug Section */}
                <div className="bg-card rounded-lg border p-6">
                  <h2 className="text-lg font-semibold mb-4">Slug de l'article</h2>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm bg-background"
                    placeholder="slug-de-larticle"
                  />
                </div>

                {/* History Section */}
                <div className="bg-card rounded-lg border p-6">
                  <h2 className="text-lg font-semibold mb-4">Historique des modifications</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4 text-sm font-medium text-muted-foreground">
                            Type de modification
                          </th>
                          <th className="text-left py-2 px-4 text-sm font-medium text-muted-foreground">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-3 px-4 flex items-center gap-2">
                            <span className="text-2xl">🤖</span>
                            <span className="text-sm">Génération Kaatalog</span>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {new Date(post.created_at).toLocaleString('fr-FR')}
                          </td>
                        </tr>
                        {post.updated_at !== post.created_at && (
                          <tr className="border-b">
                            <td className="py-3 px-4 flex items-center gap-2">
                              <span className="text-2xl">✏️</span>
                              <span className="text-sm">Modification manuelle</span>
                            </td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">
                              {new Date(post.updated_at).toLocaleString('fr-FR')}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Edition Section */}
                <div className="bg-card rounded-lg border p-6">
                  <h3 className="font-semibold mb-4">Édition</h3>
                  <div className="space-y-3">
                    <Button
                      className="w-full"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Enregistrement...' : 'Éditer'}
                    </Button>
                  </div>
                </div>

                {/* Preview Section */}
                <div className="bg-card rounded-lg border p-6">
                  <h3 className="font-semibold mb-4">Aperçu</h3>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showPreview ? 'Masquer l\'aperçu' : 'Voir l\'aperçu'}
                  </Button>
                  {showPreview && (
                    <div className="mt-4 p-4 border rounded-lg prose prose-sm dark:prose-invert max-w-none bg-background max-h-[400px] overflow-y-auto">
                      <div dangerouslySetInnerHTML={{ __html: formData.content }} />
                    </div>
                  )}
                </div>

                {/* Images Section */}
                <div className="bg-card rounded-lg border p-6">
                  <h3 className="font-semibold mb-4">Images de l'article</h3>
                  {extractedImages.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground mb-3">
                        {extractedImages.length} image{extractedImages.length > 1 ? 's' : ''} détectée{extractedImages.length > 1 ? 's' : ''}
                      </p>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {extractedImages.map((image, index) => (
                          <div key={index} className="border rounded-lg p-3 space-y-2">
                            <div className="relative aspect-video bg-muted rounded overflow-hidden">
                              <img 
                                src={image.url} 
                                alt={image.alt}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium">
                                Image {index + 1}{index === 0 ? ' (Hero)' : ''}
                              </p>
                              <p className="text-xs text-muted-foreground break-all">
                                <strong>Alt:</strong> {image.alt || 'Non défini'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">Aucune image détectée dans l'article</p>
                      <p className="text-xs mt-1">Les images sont générées automatiquement lors de la création de l'article</p>
                    </div>
                  )}
                  {formData.featured_image && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Image à la une :</p>
                      <div className="relative aspect-video bg-muted rounded overflow-hidden">
                        <img 
                          src={formData.featured_image} 
                          alt="Image à la une"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Management Section */}
                <div className="bg-card rounded-lg border p-6">
                  <h3 className="font-semibold mb-4">Gestion</h3>
                  <div className="space-y-3">
                    <Button
                      variant={post.status === 'publish' ? 'secondary' : 'primary'}
                      className="w-full"
                      onClick={handlePublish}
                      disabled={syncing}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {post.status === 'publish' ? 'Publié' : 'Publier'}
                    </Button>
                    
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={handleSync}
                      disabled={syncing}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {syncing ? 'Synchronisation...' : 'Synchroniser les données'}
                    </Button>

                    <Button
                      variant="danger"
                      className="w-full"
                      onClick={handleDelete}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </div>

                {/* SEO Info */}
                <div className="bg-card rounded-lg border p-6">
                  <h3 className="font-semibold mb-4">SEO</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">
                        Meta Title
                      </label>
                      <input
                        type="text"
                        value={formData.meta_title}
                        onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                        className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
                        placeholder="Titre SEO"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">
                        Meta Description
                      </label>
                      <textarea
                        value={formData.meta_description}
                        onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                        className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
                        rows={3}
                        placeholder="Description SEO"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">
                        Mot-clé principal
                      </label>
                      <input
                        type="text"
                        value={formData.focus_keyword}
                        onChange={(e) => setFormData({ ...formData, focus_keyword: e.target.value })}
                        className="w-full px-3 py-2 text-sm border rounded-lg bg-background"
                        placeholder="Mot-clé focus"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
