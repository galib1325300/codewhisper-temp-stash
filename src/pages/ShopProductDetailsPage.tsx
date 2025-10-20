import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import ShopNavigation from '../components/ShopNavigation';
import { getShopById } from '../utils/shops';
import { Shop } from '../utils/types';
import { ArrowLeft, Eye, Edit, Sparkles, Link2, ImagePlus, Trash2, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LoadingState from '@/components/ui/loading-state';

interface Product {
  id: string;
  name: string;
  description: string;
  short_description: string;
  images: any[];
  slug: string;
  categories: any[];
}

export default function ShopProductDetailsPage() {
  const { id, productId } = useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingShortDesc, setEditingShortDesc] = useState(false);
  const [editingLongDesc, setEditingLongDesc] = useState(false);

  useEffect(() => {
    loadData();
  }, [id, productId]);

  const loadData = async () => {
    if (!id || !productId) return;
    
    try {
      const shopData = await getShopById(id);
      setShop(shopData);

      const { data: productData, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      setProduct(productData as any);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement du produit');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    toast.info('Publication en cours...');
    setHasChanges(false);
  };

  const handleDiscardChanges = () => {
    loadData();
    setHasChanges(false);
    toast.success('Modifications annulées');
  };

  const handleGenerateShortDesc = async () => {
    toast.info('Génération de la description courte...');
  };

  const handleGenerateLongDesc = async () => {
    toast.info('Génération de la description longue...');
  };

  const handleAddInternalLinks = async () => {
    if (!product || !product.categories) return;
    
    const categories = Array.isArray(product.categories) ? product.categories : [];
    if (categories.length === 0) {
      toast.error('Ce produit n\'a pas de collections associées');
      return;
    }

    const linksHTML = categories.map((cat: any) => 
      `<a href="/collections/${cat.slug || ''}">${cat.name}</a>`
    ).join(', ');

    const updatedDesc = `${product.description}\n\n<p>Découvrez également : ${linksHTML}</p>`;
    
    const { error } = await supabase
      .from('products')
      .update({ description: updatedDesc })
      .eq('id', productId);

    if (error) {
      toast.error('Erreur lors de l\'ajout du maillage');
      return;
    }

    toast.success('Maillage interne ajouté');
    setHasChanges(true);
    loadData();
  };

  const handleGenerateAltImages = async () => {
    toast.info('Génération des textes alt en cours...');
  };

  const handleImproveImageQuality = async () => {
    toast.info('Amélioration de la qualité des images...');
  };

  const handleDeleteProduct = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      toast.error('Erreur lors de la suppression');
      return;
    }

    toast.success('Produit supprimé');
    window.location.href = `/admin/shops/${id}/products`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNavbar />
        <div className="flex">
          <AdminSidebar />
          <main className="flex-1 p-8">
            <LoadingState />
          </main>
        </div>
      </div>
    );
  }

  if (!shop || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Produit non trouvé</h2>
          <p className="mt-2 text-muted-foreground">Le produit que vous recherchez n'existe pas.</p>
        </div>
      </div>
    );
  }

  const mainImage = product.images?.[0]?.src || '/placeholder.svg';
  const productUrl = `${shop.url}/produit/${product.slug}`;

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            <Link
              to={`/admin/shops/${id}/products`}
              className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux produits
            </Link>

            <ShopNavigation shopName={shop.name} />

            {hasChanges && (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Cette fiche produit comporte des modifications non publiées sur votre boutique.</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleDiscardChanges}>
                      Effacer les modifications
                    </Button>
                    <Button size="sm" onClick={handlePublish}>
                      Publier
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Card className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div className="md:col-span-1">
                  <img
                    src={mainImage}
                    alt={product.name}
                    className="w-full rounded-lg border"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <div className="flex items-start justify-between mb-4">
                    <h1 className="text-3xl font-bold">{product.name}</h1>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingTitle(!editingTitle)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Éditer
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={productUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Aperçu
                        </a>
                      </Button>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Description courte</h3>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingShortDesc(!editingShortDesc)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleGenerateShortDesc}>
                          <Sparkles className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {editingShortDesc ? (
                      <Textarea
                        value={product.short_description || ''}
                        className="min-h-[100px]"
                        onChange={(e) => setProduct({ ...product, short_description: e.target.value })}
                      />
                    ) : (
                      <p className="text-muted-foreground">{product.short_description || 'Aucune description courte'}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Description longue</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditingLongDesc(!editingLongDesc)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Éditer
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleGenerateLongDesc}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Générer
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleAddInternalLinks}>
                      <Link2 className="w-4 h-4 mr-2" />
                      Ajouter le maillage interne
                    </Button>
                  </div>
                </div>
                {editingLongDesc ? (
                  <Textarea
                    value={product.description || ''}
                    className="min-h-[300px]"
                    onChange={(e) => setProduct({ ...product, description: e.target.value })}
                  />
                ) : (
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: product.description || 'Aucune description' }}
                  />
                )}
              </div>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Images</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleGenerateAltImages}>
                      <ImagePlus className="w-4 h-4 mr-2" />
                      Générer les alt images
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleImproveImageQuality}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Améliorer la qualité
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {product.images?.map((image: any, index: number) => (
                    <div key={index} className="relative">
                      <img
                        src={image.src || '/placeholder.svg'}
                        alt={image.alt || product.name}
                        className="w-full aspect-square object-cover rounded-lg border"
                      />
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {image.alt || 'Pas de texte alt'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Historique des modifications</h2>
                <p className="text-muted-foreground">Aucune modification à afficher</p>
              </div>

              <div className="pt-6 border-t">
                <Button variant="destructive" onClick={handleDeleteProduct}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer ce produit
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Si ce produit est supprimé, il le sera également sur votre boutique. Cette action est irréversible.
                </p>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}