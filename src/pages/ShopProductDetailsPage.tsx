import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import ShopNavigation from '../components/ShopNavigation';
import { getShopById } from '../utils/shops';
import { Shop } from '../utils/types';
import { ArrowLeft, Eye, Edit, Sparkles, Link2, ImagePlus, Trash2, AlertCircle, ExternalLink, Save, X, Languages, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LoadingState from '@/components/ui/loading-state';
import { WooCommerceService } from '../utils/woocommerce';
import { useAuth } from '../hooks/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Product {
  id: string;
  name: string;
  description: string;
  short_description: string;
  images: any[];
  slug: string;
  categories: any[];
  meta_title?: string;
  meta_description?: string;
}

interface ProductModification {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  modified_at: string;
}

export default function ShopProductDetailsPage() {
  const { id, productId } = useParams();
  const { user } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [modifications, setModifications] = useState<ProductModification[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingShortDesc, setEditingShortDesc] = useState(false);
  const [editingLongDesc, setEditingLongDesc] = useState(false);
  const [editingMetaDesc, setEditingMetaDesc] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [tempShortDesc, setTempShortDesc] = useState('');
  const [tempLongDesc, setTempLongDesc] = useState('');
  const [tempMetaDesc, setTempMetaDesc] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [totalHistoryPages, setTotalHistoryPages] = useState(1);
  const [translationDialogOpen, setTranslationDialogOpen] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [translationPreview, setTranslationPreview] = useState<any>(null);
  const [translating, setTranslating] = useState(false);
  
  const ITEMS_PER_PAGE = 10;

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

      // Load modification history with pagination
      const { data: modsData, error: modsError, count } = await supabase
        .from('product_modifications')
        .select('*', { count: 'exact' })
        .eq('product_id', productId)
        .order('modified_at', { ascending: false })
        .range((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE - 1);

      if (!modsError && modsData) {
        setModifications(modsData as ProductModification[]);
        if (count) {
          setTotalHistoryPages(Math.ceil(count / ITEMS_PER_PAGE));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement du produit');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!id || !productId) return;
    
    toast.info('Publication en cours...');
    
    try {
      const result = await WooCommerceService.updateProduct(id, productId);
      
      if (result.success) {
        setHasChanges(false);
        toast.success('Produit publié avec succès sur votre site WooCommerce');
      } else {
        toast.error(result.error || 'Erreur lors de la publication');
      }
    } catch (error) {
      console.error('Error publishing product:', error);
      toast.error('Erreur lors de la publication du produit');
    }
  };

  const handleDiscardChanges = () => {
    loadData();
    setHasChanges(false);
    toast.success('Modifications annulées');
  };

  const handleSaveTitle = async () => {
    if (!tempTitle.trim()) {
      toast.error('Le titre ne peut pas être vide');
      return;
    }

    const { error } = await supabase
      .from('products')
      .update({ name: tempTitle })
      .eq('id', productId);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      return;
    }

    setProduct({ ...product!, name: tempTitle });
    setEditingTitle(false);
    setHasChanges(true);
    toast.success('Titre mis à jour');
  };

  const handleSaveShortDesc = async () => {
    const { error } = await supabase
      .from('products')
      .update({ short_description: tempShortDesc })
      .eq('id', productId);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      return;
    }

    setProduct({ ...product!, short_description: tempShortDesc });
    setEditingShortDesc(false);
    setHasChanges(true);
    toast.success('Description courte mise à jour');
  };

  const handleSaveLongDesc = async () => {
    const { error } = await supabase
      .from('products')
      .update({ description: tempLongDesc })
      .eq('id', productId);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      return;
    }

    setProduct({ ...product!, description: tempLongDesc });
    setEditingLongDesc(false);
    setHasChanges(true);
    toast.success('Description longue mise à jour');
  };

  const handleGenerateShortDesc = async () => {
    setGenerating(true);
    toast.info('Génération de la description courte...');
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-product-description', {
        body: { productId, type: 'short', userId: user?.id }
      });

      if (error) throw error;

      if (data.success) {
        setProduct({ ...product!, short_description: data.description });
        setHasChanges(true);
        toast.success('Description courte générée avec succès');
      } else {
        toast.error(data.error || 'Erreur lors de la génération');
      }
    } catch (error: any) {
      console.error('Error generating short description:', error);
      toast.error(error.message || 'Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateLongDesc = async () => {
    setGenerating(true);
    toast.info('Génération de la description longue...');
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-product-description', {
        body: { productId, type: 'long', userId: user?.id }
      });

      if (error) throw error;

      if (data.success) {
        setProduct({ ...product!, description: data.description });
        setHasChanges(true);
        toast.success('Description longue générée avec succès');
      } else {
        toast.error(data.error || 'Erreur lors de la génération');
      }
    } catch (error: any) {
      console.error('Error generating long description:', error);
      toast.error(error.message || 'Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
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
    setGenerating(true);
    toast.info('Génération des textes alt en cours...');
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-alt-texts', {
        body: { 
          productId,
          userId: user?.id 
        }
      });

      if (error) throw error;

      if (data.success) {
        setProduct({ ...product!, images: data.images });
        setHasChanges(true);
        toast.success('Textes alt générés avec succès');
      } else {
        toast.error(data.error || 'Erreur lors de la génération');
      }
    } catch (error: any) {
      console.error('Error generating alt texts:', error);
      toast.error(error.message || 'Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateMetaDesc = async () => {
    setGenerating(true);
    toast.info('Génération de la méta-description...');
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-meta-description', {
        body: { productId, userId: user?.id }
      });

      if (error) throw error;

      if (data.success) {
        setProduct({ ...product!, meta_description: data.metaDescription });
        setHasChanges(true);
        toast.success('Méta-description générée avec succès');
      } else {
        toast.error(data.error || 'Erreur lors de la génération');
      }
    } catch (error: any) {
      console.error('Error generating meta description:', error);
      toast.error(error.message || 'Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveMetaDesc = async () => {
    if (tempMetaDesc.length > 160) {
      toast.error('La méta-description doit faire moins de 160 caractères');
      return;
    }

    const { error } = await supabase
      .from('products')
      .update({ meta_description: tempMetaDesc })
      .eq('id', productId);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      return;
    }

    setProduct({ ...product!, meta_description: tempMetaDesc });
    setEditingMetaDesc(false);
    setHasChanges(true);
    toast.success('Méta-description mise à jour');
  };

  const handleTranslate = async (apply = false) => {
    setTranslating(true);
    toast.info(`Traduction en cours vers ${targetLanguage}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('translate-product', {
        body: { productId, targetLanguage, applyTranslation: apply }
      });

      if (error) throw error;

      if (data.success) {
        if (apply) {
          setProduct({
            ...product!,
            name: data.translation.name,
            short_description: data.translation.short_description,
            description: data.translation.description,
            meta_title: data.translation.meta_title,
            meta_description: data.translation.meta_description
          });
          setHasChanges(true);
          setTranslationDialogOpen(false);
          toast.success('Traduction appliquée avec succès');
        } else {
          setTranslationPreview(data.translation);
          toast.success('Aperçu de la traduction disponible');
        }
      } else {
        toast.error(data.error || 'Erreur lors de la traduction');
      }
    } catch (error: any) {
      console.error('Error translating product:', error);
      toast.error(error.message || 'Erreur lors de la traduction');
    } finally {
      setTranslating(false);
    }
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
                  <div className="mb-4">
                    {editingTitle ? (
                      <div className="space-y-2">
                        <Input
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value)}
                          placeholder="Nom du produit"
                          className="text-2xl font-bold"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveTitle}>
                            <Save className="w-4 h-4 mr-2" />
                            Enregistrer
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setEditingTitle(false);
                            setTempTitle(product.name);
                          }}>
                            <X className="w-4 h-4 mr-2" />
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <h1 className="text-3xl font-bold">{product.name}</h1>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            setEditingTitle(true);
                            setTempTitle(product.name);
                          }}>
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
                    )}
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold">Traduction</h3>
                      <Dialog open={translationDialogOpen} onOpenChange={setTranslationDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Languages className="w-4 h-4 mr-2" />
                            Traduire le produit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Traduire le produit</DialogTitle>
                            <DialogDescription>
                              Sélectionnez la langue cible et prévisualisez la traduction avant de l'appliquer.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4 mt-4">
                            <div>
                              <label className="text-sm font-medium mb-2 block">Langue cible</label>
                              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="en">🇬🇧 Anglais</SelectItem>
                                  <SelectItem value="es">🇪🇸 Espagnol</SelectItem>
                                  <SelectItem value="de">🇩🇪 Allemand</SelectItem>
                                  <SelectItem value="it">🇮🇹 Italien</SelectItem>
                                  <SelectItem value="pt">🇵🇹 Portugais</SelectItem>
                                  <SelectItem value="nl">🇳🇱 Néerlandais</SelectItem>
                                  <SelectItem value="pl">🇵🇱 Polonais</SelectItem>
                                  <SelectItem value="ru">🇷🇺 Russe</SelectItem>
                                  <SelectItem value="ja">🇯🇵 Japonais</SelectItem>
                                  <SelectItem value="zh">🇨🇳 Chinois</SelectItem>
                                  <SelectItem value="ar">🇸🇦 Arabe</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex gap-2">
                              <Button onClick={() => handleTranslate(false)} disabled={translating}>
                                <Eye className="w-4 h-4 mr-2" />
                                Prévisualiser
                              </Button>
                              <Button onClick={() => handleTranslate(true)} disabled={translating || !translationPreview}>
                                <Save className="w-4 h-4 mr-2" />
                                Appliquer la traduction
                              </Button>
                            </div>

                            {translationPreview && (
                              <div className="space-y-4 border-t pt-4">
                                <div>
                                  <label className="text-sm font-medium">Titre traduit</label>
                                  <p className="text-sm mt-1">{translationPreview.name}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Description courte traduite</label>
                                  <p className="text-sm mt-1">{translationPreview.short_description}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Méta-description traduite</label>
                                  <p className="text-sm mt-1">{translationPreview.meta_description}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Description longue traduite (extrait)</label>
                                  <div 
                                    className="text-sm mt-1 prose prose-sm max-w-none" 
                                    dangerouslySetInnerHTML={{ __html: translationPreview.description?.substring(0, 500) + '...' }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Méta-description SEO</h3>
                      <div className="flex gap-2">
                        {!editingMetaDesc && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setEditingMetaDesc(true);
                              setTempMetaDesc(product.meta_description || '');
                            }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={handleGenerateMetaDesc}
                              disabled={generating}
                            >
                              <Sparkles className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {editingMetaDesc ? (
                      <div className="space-y-2">
                        <Textarea
                          value={tempMetaDesc}
                          className="min-h-[80px]"
                          onChange={(e) => setTempMetaDesc(e.target.value)}
                          maxLength={160}
                        />
                        <p className="text-xs text-muted-foreground">
                          {tempMetaDesc.length}/160 caractères
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveMetaDesc}>
                            <Save className="w-4 h-4 mr-2" />
                            Enregistrer
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setEditingMetaDesc(false);
                            setTempMetaDesc(product.meta_description || '');
                          }}>
                            <X className="w-4 h-4 mr-2" />
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        {product.meta_description || 'Aucune méta-description (important pour le SEO Google)'}
                      </p>
                    )}
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Description courte</h3>
                      <div className="flex gap-2">
                        {!editingShortDesc && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setEditingShortDesc(true);
                              setTempShortDesc(product.short_description || '');
                            }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={handleGenerateShortDesc}
                              disabled={generating}
                            >
                              <Sparkles className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {editingShortDesc ? (
                      <div className="space-y-2">
                        <Textarea
                          value={tempShortDesc}
                          className="min-h-[100px]"
                          onChange={(e) => setTempShortDesc(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveShortDesc}>
                            <Save className="w-4 h-4 mr-2" />
                            Enregistrer
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setEditingShortDesc(false);
                            setTempShortDesc(product.short_description || '');
                          }}>
                            <X className="w-4 h-4 mr-2" />
                            Annuler
                          </Button>
                        </div>
                      </div>
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
                    {!editingLongDesc && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => {
                          setEditingLongDesc(true);
                          setTempLongDesc(product.description || '');
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Éditer
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleGenerateLongDesc}
                          disabled={generating}
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Générer
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleAddInternalLinks}>
                          <Link2 className="w-4 h-4 mr-2" />
                          Ajouter le maillage interne
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {editingLongDesc ? (
                  <div className="space-y-2">
                    <Textarea
                      value={tempLongDesc}
                      className="min-h-[300px]"
                      onChange={(e) => setTempLongDesc(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveLongDesc}>
                        <Save className="w-4 h-4 mr-2" />
                        Enregistrer
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditingLongDesc(false);
                        setTempLongDesc(product.description || '');
                      }}>
                        <X className="w-4 h-4 mr-2" />
                        Annuler
                      </Button>
                    </div>
                  </div>
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
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGenerateAltImages}
                      disabled={generating}
                    >
                      <ImagePlus className="w-4 h-4 mr-2" />
                      Générer les alt images
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleImproveImageQuality}
                      disabled={generating}
                    >
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
                {modifications.length === 0 ? (
                  <p className="text-muted-foreground">Aucune modification à afficher</p>
                ) : (
                  <>
                    <div className="space-y-3">
                      {modifications.map((mod) => {
                        const fieldLabels: Record<string, string> = {
                          name: 'Nom du produit',
                          short_description: 'Description courte',
                          description: 'Description longue',
                          images: 'Images',
                          meta_description: 'Méta-description'
                        };
                        
                        return (
                          <div key={mod.id} className="border-l-2 border-primary pl-4 py-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{fieldLabels[mod.field_name] || mod.field_name}</span>
                              <span className="text-sm text-muted-foreground">
                                {new Date(mod.modified_at).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {mod.old_value && mod.field_name !== 'images' && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Ancienne valeur: </span>
                                <span className="line-through text-destructive">{mod.old_value.substring(0, 100)}{mod.old_value.length > 100 ? '...' : ''}</span>
                              </div>
                            )}
                            {mod.new_value && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Nouvelle valeur: </span>
                                <span className="text-foreground font-medium">{mod.new_value.substring(0, 100)}{mod.new_value.length > 100 ? '...' : ''}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {totalHistoryPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                          disabled={historyPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Précédent
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          Page {historyPage} sur {totalHistoryPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                          disabled={historyPage === totalHistoryPages}
                        >
                          Suivant
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
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