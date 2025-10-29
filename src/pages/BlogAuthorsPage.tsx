import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Award, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  articles_count?: number;
}

export default function BlogAuthorsPage() {
  const { id: shopId } = useParams();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [authors, setAuthors] = useState<BlogAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [shopId]);

  const loadData = async () => {
    if (!shopId) return;

    try {
      const shopData = await getShopById(shopId);
      setShop(shopData);

      // Load authors with article counts
      const { data: authorsData, error } = await supabase
        .from('blog_authors')
        .select(`
          *,
          blog_posts(count)
        `)
        .eq('shop_id', shopId)
        .order('name');

      if (error) throw error;

      const authorsWithCounts = authorsData.map(author => ({
        ...author,
        expertise_areas: (author.expertise_areas as unknown as string[]) || [],
        social_links: (author.social_links as unknown as { linkedin?: string; twitter?: string; website?: string }) || {},
        articles_count: author.blog_posts?.[0]?.count || 0
      }));

      setAuthors(authorsWithCounts as BlogAuthor[]);
    } catch (error) {
      console.error('Error loading authors:', error);
      toast.error('Erreur lors du chargement des auteurs');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1">
          {shop && <ShopNavigation shopName={shop.name} />}
          
          <main className="p-8 max-w-7xl mx-auto">
            {/* Header with SEO */}
            <header className="mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Nos Experts
              </h1>
              <p className="text-lg text-muted-foreground max-w-3xl">
                Découvrez notre équipe d'experts passionnés qui partagent leurs connaissances 
                et leur expérience pour vous aider à prendre les meilleures décisions.
              </p>
            </header>

            {/* Authors Grid */}
            {authors.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Aucun auteur pour le moment</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {authors.map((author) => (
                  <Card 
                    key={author.id}
                    className="hover:shadow-lg transition-all duration-300 hover:border-primary/30 cursor-pointer group"
                    onClick={() => navigate(`/admin/shops/${shopId}/authors/${author.id}`)}
                  >
                    <CardContent className="pt-6">
                      <article itemScope itemType="https://schema.org/Person">
                        {/* Avatar */}
                        <div className="flex justify-center mb-4">
                          {author.avatar_url ? (
                            <img 
                              src={author.avatar_url} 
                              alt={`Portrait de ${author.name}`}
                              itemProp="image"
                              className="w-24 h-24 rounded-full object-cover border-4 border-border group-hover:border-primary/30 transition-colors"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-border group-hover:border-primary/30 transition-colors">
                              <User className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Name & Title */}
                        <div className="text-center mb-4">
                          <h2 className="text-xl font-bold text-foreground mb-1" itemProp="name">
                            {author.name}
                          </h2>
                          <p className="text-sm text-muted-foreground" itemProp="jobTitle">
                            {author.title}
                          </p>
                        </div>

                        {/* Bio */}
                        <p 
                          className="text-sm text-muted-foreground mb-4 line-clamp-3 text-center"
                          itemProp="description"
                        >
                          {author.bio}
                        </p>

                        {/* Expertise Areas */}
                        <div className="flex flex-wrap gap-1 justify-center mb-4">
                          {author.expertise_areas.slice(0, 3).map((area, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                          {author.expertise_areas.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{author.expertise_areas.length - 3}
                            </Badge>
                          )}
                        </div>

                        {/* Credentials */}
                        {author.credentials && (
                          <div className="flex items-center justify-center gap-2 text-xs bg-muted/50 p-2 rounded-lg mb-4">
                            <Award className="h-3 w-3 text-primary flex-shrink-0" />
                            <p className="text-muted-foreground line-clamp-1" itemProp="award">
                              {author.credentials}
                            </p>
                          </div>
                        )}

                        {/* Stats & CTA */}
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                          <span className="text-xs text-muted-foreground">
                            {author.articles_count || 0} article{(author.articles_count || 0) > 1 ? 's' : ''}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="group-hover:text-primary transition-colors"
                          >
                            Voir le profil
                            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </Button>
                        </div>

                        {/* Hidden Schema.org data */}
                        <meta itemProp="url" content={`${window.location.origin}/admin/shops/${shopId}/authors/${author.id}`} />
                        {author.social_links?.linkedin && (
                          <link itemProp="sameAs" href={author.social_links.linkedin} />
                        )}
                        {author.social_links?.twitter && (
                          <link itemProp="sameAs" href={author.social_links.twitter} />
                        )}
                        {author.social_links?.website && (
                          <link itemProp="sameAs" href={author.social_links.website} />
                        )}
                      </article>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* JSON-LD Schema for collection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Experts et Auteurs",
            "description": "Notre équipe d'experts passionnés",
            "numberOfItems": authors.length,
            "itemListElement": authors.map((author, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
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
                ].filter(Boolean)
              }
            }))
          })
        }}
      />
    </div>
  );
}
