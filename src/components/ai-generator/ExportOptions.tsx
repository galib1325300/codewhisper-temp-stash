import React from 'react';
import { Download, FileText, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useExportCatalog } from '@/hooks/useAIGenerator';
import { useToast } from '@/hooks/use-toast';

interface ExportOptionsProps {
  siteId?: string;
  wooUrl?: string | null;
  shopifyUrl?: string | null;
}

export default function ExportOptions({ siteId, wooUrl, shopifyUrl }: ExportOptionsProps) {
  const { toast } = useToast();
  const exportMutation = useExportCatalog();

  const handleExport = async (format: 'woocommerce' | 'shopify') => {
    if (!siteId) {
      toast({ 
        title: 'Erreur', 
        description: 'Aucun site généré', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      const result = await exportMutation.mutateAsync({ siteId, format });
      
      // Download file
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ 
        title: 'Export réussi', 
        description: `${result.productsCount} produits exportés au format ${format}` 
      });
    } catch (error: any) {
      toast({ 
        title: 'Erreur d\'export', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Téléchargez votre catalogue au format de votre choix
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">WooCommerce</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Format CSV compatible avec WordPress + WooCommerce. Importez directement dans votre boutique.
              </p>
              
              {wooUrl ? (
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(wooUrl, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger CSV
                  </Button>
                  <p className="text-xs text-muted-foreground">Déjà généré</p>
                </div>
              ) : (
                <Button 
                  className="w-full"
                  onClick={() => handleExport('woocommerce')}
                  disabled={!siteId || exportMutation.isPending}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {exportMutation.isPending ? 'Génération...' : 'Générer CSV WooCommerce'}
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-6 h-6 text-success" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Shopify</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Format CSV compatible avec Shopify. Importez via Products &gt; Import.
              </p>
              
              {shopifyUrl ? (
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => window.open(shopifyUrl, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger CSV
                  </Button>
                  <p className="text-xs text-muted-foreground">Déjà généré</p>
                </div>
              ) : (
                <Button 
                  className="w-full"
                  onClick={() => handleExport('shopify')}
                  disabled={!siteId || exportMutation.isPending}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {exportMutation.isPending ? 'Génération...' : 'Générer CSV Shopify'}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-semibold mb-2">Guide d'import :</h4>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• <strong>WooCommerce:</strong> WP Admin → Produits → Importer → Sélectionnez le CSV</li>
          <li>• <strong>Shopify:</strong> Admin → Produits → Import → Upload CSV</li>
          <li>• Les images peuvent nécessiter un téléchargement manuel</li>
        </ul>
      </div>
    </div>
  );
}
