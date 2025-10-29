import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Award, Linkedin, Twitter, Globe, ArrowLeft, Calendar, Eye } from 'lucide-react';
import AdminNavbar from '@/components/AdminNavbar';
import AdminSidebar from '@/components/AdminSidebar';
import ShopNavigation from '@/components/ShopNavigation';
import { getShopById } from '@/utils/shops';
import { Shop } from '@/utils/types';

interface BlogAuthor {
  id: string;
  name: string;
  title: string;
  bio: string;
  expertise_areas: string[];
  credentials?: string;
  avatar_url?: string;
  social_links?: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
}

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  featured_image?: string;
  published_at?: string;
  status: string;
  focus_keyword?: string;
}

export default function BlogAuthorDetailPage() {
  const { id: shopId, authorId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [author, setAuthor] = useState<BlogAuthor | null>(null);
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [shopId, authorId]);

  const loadData = async () => {
    if (!shopId || !authorId) return;

    try {
      const shopData = await getShopById(shopId);
      setShop(shopData);

      // Load author
      const { data: authorData, error: authorError } = await supabase
        .from('blog_authors')
        .select('*')
        .eq('id', authorId)
        .single();

      if (authorError) throw authorError;
      
      // Transform data types
      const transformedAuthor = {
        ...authorData,
        expertise_areas: (authorData.expertise_areas as unknown as string[]) || [],
        social_links: (authorData.social_links as unknown as { linkedin?: string; twitter?: string; website?: string }) || {}
      };
      
      setAuthor(transformedAuthor);

      // Load author's published articles
      const { data: articlesData, error: articlesError } = await supabase
        .from('blog_posts')
        .select('id, title, excerpt, slug, featured_image, published_at, status, focus_keyword')
        .eq('author_id', authorId)
        .eq('shop_id', shopId)
        .order('published_at', { ascending: false });

      if (articlesError) throw articlesError;
      setArticles(articlesData || []);
    } catch (error) {
      console.error('Error loading author:', error);
      toast.error('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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

  if (!author) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNavbar />
        <div className="flex">
          <AdminSidebar />
          <div className="flex-1 p-8">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Auteur non trouvé</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const publishedArticles = articles.filter(a => a.status === 'publish');

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1">
          {shop && <ShopNavigation shopName={shop.name} />}
          
          <main className="p-8 max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <button
              onClick={() => navigate(`/admin/shops/${shopId}/authors`)}
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux auteurs
            </button>

            {/* Author Profile Card */}
            <article itemScope itemType="https://schema.org/Person">
              <Card className="mb-8">
                <CardContent className="pt-8">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {author.avatar_url ? (
                        <img 
                          src={author.avatar_url} 
                          alt={`Portrait de ${author.name}`}
                          itemProp="image"
                          className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-border">
                          <User className="h-16 w-16 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-foreground mb-2" itemProp="name">
                        {author.name}
                      </h1>
                      <p className="text-lg text-muted-foreground mb-4" itemProp="jobTitle">
                        {author.title}
                      </p>

                      <p className="text-muted-foreground mb-6 leading-relaxed" itemProp="description">
                        {author.bio}
                      </p>

                      {/* Expertise */}
                      <div className="mb-6">
                        <h2 className="text-sm font-semibold text-foreground mb-2">Domaines d'expertise</h2>
                        <div className="flex flex-wrap gap-2">
                          {author.expertise_areas.map((area, idx) => (
                            <Badge key={idx} variant="secondary">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Credentials */}
                      {author.credentials && (
                        <div className="flex items-start gap-3 bg-muted/50 p-4 rounded-lg mb-6">
                          <Award className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <h3 className="text-sm font-semibold text-foreground mb-1">Qualifications</h3>
                            <p className="text-sm text-muted-foreground" itemProp="award">
                              {author.credentials}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Social Links */}
                      {author.social_links && (
                        <div className="flex gap-3">
                          {author.social_links.linkedin && (
                            <a 
                              href={author.social_links.linkedin} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              itemProp="sameAs"
                              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
                            >
                              <Linkedin className="h-4 w-4" />
                              <span className="text-sm">LinkedIn</span>
                            </a>
                          )}
                          {author.social_links.twitter && (
                            <a 
                              href={author.social_links.twitter} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              itemProp="sameAs"
                              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
                            >
                              <Twitter className="h-4 w-4" />
                              <span className="text-sm">Twitter</span>
                            </a>
                          )}
                          {author.social_links.website && (
                            <a 
                              href={author.social_links.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              itemProp="url"
                              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition-colors"
                            >
                              <Globe className="h-4 w-4" />
                              <span className="text-sm">Site web</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex-shrink-0 text-center p-6 bg-muted/30 rounded-lg">
                      <div className="text-4xl font-bold text-primary mb-2">
                        {publishedArticles.length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Article{publishedArticles.length > 1 ? 's' : ''} publié{publishedArticles.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Articles by Author */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Articles de {author.name}
                </h2>

                {publishedArticles.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">
                        Cet auteur n'a pas encore publié d'articles.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {publishedArticles.map((article) => (
                      <Card 
                        key={article.id}
                        className="hover:shadow-lg transition-all duration-300 hover:border-primary/30 cursor-pointer group"
                        onClick={() => navigate(`/admin/shops/${shopId}/blog/${article.id}`)}
                        itemScope
                        itemType="https://schema.org/BlogPosting"
                      >
                        {/* Featured Image */}
                        {article.featured_image && (
                          <div className="overflow-hidden rounded-t-lg">
                            <img 
                              src={article.featured_image}
                              alt={article.title}
                              itemProp="image"
                              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}

                        <CardContent className="pt-6">
                          <h3 
                            className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors"
                            itemProp="headline"
                          >
                            {article.title}
                          </h3>

                          {article.excerpt && (
                            <p 
                              className="text-sm text-muted-foreground mb-4 line-clamp-3"
                              itemProp="description"
                            >
                              {article.excerpt}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <time itemProp="datePublished" dateTime={article.published_at}>
                                {formatDate(article.published_at)}
                              </time>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="group-hover:text-primary"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Lire
                            </Button>
                          </div>

                          {/* Hidden Schema.org data */}
                          <link itemProp="author" href={`${window.location.origin}/admin/shops/${shopId}/authors/${author.id}`} />
                          <meta itemProp="url" content={`${window.location.origin}/admin/shops/${shopId}/blog/${article.id}`} />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            </article>
          </main>
        </div>
      </div>

      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            "mainEntity": {
              "@type": "Person",
              "name": author.name,
              "jobTitle": author.title,
              "description": author.bio,
              "image": author.avatar_url,
              "url": `${window.location.origin}/admin/shops/${shopId}/authors/${author.id}`,
              "sameAs": [
                author.social_links?.linkedin,
                author.social_links?.twitter,
                author.social_links?.website
              ].filter(Boolean),
              "knowsAbout": author.expertise_areas,
              "hasCredential": author.credentials,
              "numberOfPublishedWorks": publishedArticles.length
            },
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Accueil",
                  "item": `${window.location.origin}`
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Auteurs",
                  "item": `${window.location.origin}/admin/shops/${shopId}/authors`
                },
                {
                  "@type": "ListItem",
                  "position": 3,
                  "name": author.name
                }
              ]
            }
          })
        }}
      />
    </div>
  );
}
