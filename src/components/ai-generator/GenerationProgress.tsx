import React from 'react';
import { Loader2, CheckCircle, XCircle, Package, FolderTree } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface GenerationProgressProps {
  status?: 'generating' | 'completed' | 'failed';
  productsGenerated: number;
  totalProducts: number;
  collectionsGenerated?: number;
}

export default function GenerationProgress({ 
  status, 
  productsGenerated, 
  totalProducts,
  collectionsGenerated 
}: GenerationProgressProps) {
  const progress = Math.round((productsGenerated / totalProducts) * 100);

  if (status === 'failed') {
    return (
      <div className="text-center py-12">
        <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2">Échec de la génération</h3>
        <p className="text-muted-foreground">Une erreur s'est produite. Veuillez réessayer.</p>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 mx-auto text-success mb-4" />
        <h3 className="text-xl font-semibold mb-2">Génération terminée !</h3>
        <p className="text-muted-foreground mb-8">Votre site e-commerce est prêt à être exporté</p>
        
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <div className="bg-card border rounded-lg p-4">
            <Package className="w-8 h-8 mx-auto text-primary mb-2" />
            <div className="text-2xl font-bold">{productsGenerated}</div>
            <div className="text-sm text-muted-foreground">Produits générés</div>
          </div>
          
          <div className="bg-card border rounded-lg p-4">
            <FolderTree className="w-8 h-8 mx-auto text-primary mb-2" />
            <div className="text-2xl font-bold">{collectionsGenerated || 0}</div>
            <div className="text-sm text-muted-foreground">Collections créées</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
        <h3 className="text-xl font-semibold mb-2">Génération en cours...</h3>
        <p className="text-muted-foreground">
          L'IA crée votre catalogue optimisé SEO. Cela peut prendre quelques minutes.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Produits générés</span>
          <span className="font-semibold">{productsGenerated} / {totalProducts}</span>
        </div>
        <Progress value={progress} className="h-3" />
        <div className="text-center text-lg font-semibold text-primary">
          {progress}%
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${productsGenerated > 0 ? 'bg-success' : 'bg-muted-foreground'}`} />
          <span>Scraping des concurrents</span>
          {productsGenerated > 0 && <CheckCircle className="w-4 h-4 text-success ml-auto" />}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${productsGenerated > 0 ? 'bg-success' : 'bg-muted-foreground'} ${productsGenerated > 0 && 'animate-pulse'}`} />
          <span>Génération des fiches produits IA</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${collectionsGenerated && collectionsGenerated > 0 ? 'bg-success' : 'bg-muted-foreground'}`} />
          <span>Création des collections</span>
          {collectionsGenerated && collectionsGenerated > 0 && <CheckCircle className="w-4 h-4 text-success ml-auto" />}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full bg-muted-foreground`} />
          <span>Optimisation SEO</span>
        </div>
      </div>
    </div>
  );
}
