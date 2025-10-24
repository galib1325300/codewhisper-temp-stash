import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import { getShopById } from '../utils/shops';
import { Shop } from '../utils/types';
import { ArrowLeft, Sparkles, Link as LinkIcon, Copy, Eye, Save, RefreshCw, Trash2 } from 'lucide-react';
import Button from '../components/Button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  product_count: number;
  external_id: string;
  woocommerce_id: string;
  shop_id: string;
}

export default function ShopCollectionDetailPage() {
  const { id, collectionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shop, setShop] = useState<Shop | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [allCollections, setAllCollections] = useState<Collection[]>([]);
  const [showInternalLinkDialog, setShowInternalLinkDialog] = useState(false);
  const [selectedInternalLinks, setSelectedInternalLinks] = useState<Set<string>>(new Set());
  const [generatingShort, setGeneratingShort] = useState(false);

  useEffect(() => {
    loadData();
  }, [id, collectionId]);

  const loadData = async () => {
    if (!id || !collectionId) return;

    try {
      const [shopData] = await Promise.all([
        getShopById(id),
        loadCollection(),
        loadAllCollections()
      ]);
      setShop(shopData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCollection = async () => {
    if (!collectionId) return;

    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('id', collectionId)
      .single();

    if (error) throw error;
    
    setCollection(data);
    setEditedName(data.name);
    setEditedDescription(data.description || '');
  };

  const loadAllCollections = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('shop_id', id)
      .neq('id', collectionId)
      .order('name');

    if (error) throw error;
    setAllCollections(data || []);
  };

  const handleSave = async () => {
    if (!collection) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('collections')
        .update({
          name: editedName,
          description: editedDescription,
          updated_at: new Date().toISOString()
        })
        .eq('id', collection.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Collection mise à jour"
      });

      await loadCollection();
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateLongDescription = async () => {
    if (!collection || !id) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-long-collection-description', {
        body: {
          shopId: id,
          collectionId: collection.id
        }
      });

      if (error) throw error;

      if (data.success) {
        setEditedDescription(data.description);
        toast({
          title: "Description générée",
          description: "La description longue a été générée avec succès"
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error generating:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer la description",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateShortDescription = async () => {
    if (!collection || !id) return;

    setGeneratingShort(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-short-collection-description', {
        body: {
          shopId: id,
          collectionId: collection.id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Description courte générée",
          description: "La description courte a été générée et sauvegardée"
        });
        await loadCollection();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error generating short description:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer la description courte",
        variant: "destructive"
      });
    } finally {
      setGeneratingShort(false);
    }
  };

  const toggleInternalLink = (collectionId: string) => {
    const newSelected = new Set(selectedInternalLinks);
    if (newSelected.has(collectionId)) {
      newSelected.delete(collectionId);
    } else {
      newSelected.add(collectionId);
    }
    setSelectedInternalLinks(newSelected);
  };

  const addInternalLinks = () => {
    if (!shop || selectedInternalLinks.size === 0) return;

    const selectedCollections = allCollections.filter(c => selectedInternalLinks.has(c.id));
    const links = selectedCollections
      .map(c => `<a href="${shop.url}/${shop.collectionsSlug}/${c.slug}">${c.name}</a>`)
      .join(', ');

    const linkText = `\n\nDécouvrez également nos collections : ${links}`;
    setEditedDescription(prev => prev + linkText);
    setShowInternalLinkDialog(false);
    setSelectedInternalLinks(new Set());

    toast({
      title: "Liens ajoutés",
      description: `${selectedInternalLinks.size} lien(s) interne(s) ajouté(s)`
    });
  };

  const handlePublish = async () => {
    if (!collection || !id) return;

    setSaving(true);
    try {
      // Save first
      await handleSave();

      // Then publish
      const { data, error } = await supabase.functions.invoke('publish-collection', {
        body: {
          shopId: id,
          collectionId: collection.id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Publié",
          description: "Collection publiée sur votre site"
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error publishing:', error);
      toast({
        title: "Erreur",
        description: "Impossible de publier",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!collection || !id) return;

    try {
      const { data, error } = await supabase.functions.invoke('sync-single-collection', {
        body: {
          shopId: id,
          collectionId: collection.id
        }
      });

      if (error) throw error;

      toast({
        title: "Synchronisé",
        description: "Données synchronisées depuis WooCommerce"
      });

      await loadCollection();
    } catch (error) {
      console.error('Error syncing:', error);
      toast({
        title: "Erreur",
        description: "Impossible de synchroniser",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (!collection || !id) return;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette collection ?')) return;

    try {
      const { error } = await supabase
        .from('collections')
        .delete()
        .eq('id', collection.id);

      if (error) throw error;

      toast({
        title: "Supprimé",
        description: "Collection supprimée"
      });

      navigate(`/admin/shops/${id}/collections`);
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!shop || !collection) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Collection non trouvée</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <Link
              to={`/admin/shops/${id}/collections`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la liste des collections
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main content */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="p-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Titre de la collection</Label>
                      <Input
                        id="name"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder="Nom de la collection"
                        className="mt-2"
                      />
                    </div>

                    <Separator />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Description longue</Label>
                        <div className="flex gap-2">
                          <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowInternalLinkDialog(true)}
                            className="flex items-center gap-2"
                          >
                            <LinkIcon className="w-4 h-4" />
                            Ajouter le maillage interne
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleGenerateLongDescription}
                            disabled={generating}
                            className="flex items-center gap-2"
                          >
                            <Sparkles className="w-4 h-4" />
                            {generating ? 'Génération...' : 'Générer'}
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        placeholder="Pas de description longue"
                        className="min-h-[300px] font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {editedDescription.split(' ').filter(w => w).length} mots
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Description courte</Label>
                        <Button
                          size="sm"
                          onClick={handleGenerateShortDescription}
                          disabled={generatingShort}
                          className="flex items-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          {generatingShort ? 'Génération...' : 'Générer'}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {collection.description || 'Aucune description courte'}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Produits de la collection</h3>
                  <p className="text-sm text-muted-foreground">
                    Cette collection contient {collection.product_count} produit(s).
                  </p>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Édition</h3>
                  <div className="space-y-2">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Aperçu</h3>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => shop && window.open(`${shop.url}/${shop.collectionsSlug}/${collection.slug}`, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Aperçu
                  </Button>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Gestion</h3>
                  <div className="space-y-2">
                    <Button
                      variant="secondary"
                      onClick={handlePublish}
                      disabled={saving}
                      className="w-full"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Publier
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleSync}
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Synchroniser les données
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleDelete}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Internal Links Dialog */}
      <Dialog open={showInternalLinkDialog} onOpenChange={setShowInternalLinkDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter du maillage interne</DialogTitle>
            <DialogDescription>
              Sélectionnez les collections vers lesquelles ajouter des liens internes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {allCollections.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune autre collection disponible</p>
            ) : (
              <>
                {allCollections.map((col) => (
                  <div
                    key={col.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <Checkbox
                      checked={selectedInternalLinks.has(col.id)}
                      onCheckedChange={() => toggleInternalLink(col.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{col.name}</p>
                      <p className="text-xs text-muted-foreground">{col.slug}</p>
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowInternalLinkDialog(false);
                      setSelectedInternalLinks(new Set());
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={addInternalLinks}
                    disabled={selectedInternalLinks.size === 0}
                  >
                    Ajouter {selectedInternalLinks.size > 0 && `(${selectedInternalLinks.size})`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
