import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import ShopNavigation from '../components/ShopNavigation';
import { getShopById } from '../utils/shops';
import { Shop } from '../utils/types';
import { Search, RefreshCw, Sparkles } from 'lucide-react';
import Button from '../components/Button';
import { supabase } from '@/integrations/supabase/client';
import { WooCommerceService } from '@/utils/woocommerce';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  product_count: number;
  external_id: string;
}

export default function ShopCollectionsPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const loadShop = async () => {
      if (!id) return;
      
      try {
        const shopData = await getShopById(id);
        setShop(shopData);
        await loadCollections();
      } catch (error) {
        console.error('Error loading shop:', error);
      } finally {
        setLoading(false);
      }
    };

    loadShop();
  }, [id]);

  const loadCollections = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('shop_id', id)
        .order('name');

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error loading collections:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les collections",
        variant: "destructive"
      });
    }
  };

  const handleSync = async () => {
    if (!id) return;
    
    setSyncing(true);
    try {
      const result = await WooCommerceService.syncCollections(id);
      
      if (result.success) {
        toast({
          title: "Synchronisation réussie",
          description: `${result.count} collections synchronisées`
        });
        await loadCollections();
      } else {
        toast({
          title: "Erreur de synchronisation",
          description: result.error || "Impossible de synchroniser les collections",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error syncing:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la synchronisation",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleCollection = (collectionId: string) => {
    const newSelected = new Set(selectedCollections);
    if (newSelected.has(collectionId)) {
      newSelected.delete(collectionId);
    } else {
      newSelected.add(collectionId);
    }
    setSelectedCollections(newSelected);
  };

  const toggleAll = () => {
    if (selectedCollections.size === filteredCollections.length) {
      setSelectedCollections(new Set());
    } else {
      setSelectedCollections(new Set(filteredCollections.map(c => c.id)));
    }
  };

  const handleGenerateDescriptions = async () => {
    if (selectedCollections.size === 0) {
      toast({
        title: "Aucune sélection",
        description: "Veuillez sélectionner au moins une collection",
        variant: "destructive"
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-collection-descriptions', {
        body: { 
          shopId: id,
          collectionIds: Array.from(selectedCollections)
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Génération réussie",
          description: `${data.updated} descriptions générées et publiées`
        });
        await loadCollections();
        setSelectedCollections(new Set());
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Impossible de générer les descriptions",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error generating descriptions:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la génération",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            
            <div className="bg-card rounded-lg shadow-sm">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-foreground">Collections</h2>
                    {collections.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {selectedCollections.size} sélectionnée(s)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Rechercher une collection..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
                      />
                    </div>
                    <Button 
                      onClick={handleSync} 
                      disabled={syncing}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Synchronisation...' : 'Actualiser'}
                    </Button>
                  </div>
                </div>

                {selectedCollections.size > 0 && (
                  <div className="flex items-center gap-2 p-4 bg-primary/10 rounded-lg">
                    <Button
                      onClick={handleGenerateDescriptions}
                      disabled={generating}
                      className="flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      {generating ? 'Génération en cours...' : `Générer les descriptions SEO (${selectedCollections.size})`}
                    </Button>
                  </div>
                )}
              </div>

              <div className="p-6">
                {collections.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-muted-foreground mb-4">
                      <Search className="w-12 h-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Aucune collection trouvée
                    </h3>
                    <p className="text-muted-foreground">
                      Cliquez sur "Actualiser" pour synchroniser vos collections
                    </p>
                  </div>
                ) : filteredCollections.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-muted-foreground mb-4">
                      <Search className="w-12 h-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Aucun résultat
                    </h3>
                    <p className="text-muted-foreground">
                      Aucune collection ne correspond à votre recherche
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <Checkbox
                        checked={selectedCollections.size === filteredCollections.length}
                        onCheckedChange={toggleAll}
                      />
                      <span className="font-medium text-sm">Tout sélectionner</span>
                    </div>

                    {filteredCollections.map((collection) => (
                      <div
                        key={collection.id}
                        className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                        onClick={(e) => {
                          // Don't navigate if clicking checkbox
                          if (!(e.target as HTMLElement).closest('[role="checkbox"]')) {
                            window.location.href = `/admin/shops/${id}/collections/${collection.id}`;
                          }
                        }}
                      >
                        <Checkbox
                          checked={selectedCollections.has(collection.id)}
                          onCheckedChange={() => toggleCollection(collection.id)}
                        />
                        
                        {collection.image && (
                          <img
                            src={collection.image}
                            alt={collection.name}
                            className="w-16 h-16 rounded object-cover"
                          />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground mb-1">
                            {collection.name}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {collection.description || 'Aucune description'}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{collection.product_count} produit(s)</span>
                            <span>•</span>
                            <span>{collection.slug}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}