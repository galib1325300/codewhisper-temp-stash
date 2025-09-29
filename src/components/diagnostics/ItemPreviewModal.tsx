import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ItemPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name?: string;
    title?: string;
    type: string;
    images?: Array<{
      src: string;
      alt?: string;
    }>;
    description?: string;
    short_description?: string;
    url?: string;
  } | null;
  issueType: string;
}

export default function ItemPreviewModal({
  isOpen,
  onClose,
  item,
  issueType
}: ItemPreviewModalProps) {
  if (!item) return null;

  const getItemDisplayName = () => {
    return item.name || item.title || `Élément ${item.id.slice(0, 8)}`;
  };

  const renderImagePreview = () => {
    if (issueType !== 'Images' || !item.images?.length) return null;

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Images sans texte alternatif :</h4>
        <div className="grid grid-cols-2 gap-3">
          {item.images.filter(img => !img.alt).map((image, index) => (
            <div key={index} className="border rounded-lg p-3 space-y-2">
              <div className="aspect-square bg-muted rounded flex items-center justify-center">
                {image.src ? (
                  <img 
                    src={image.src} 
                    alt=""
                    className="max-w-full max-h-full object-contain rounded"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className="hidden flex-col items-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-xs mt-1">Image non disponible</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <p className="truncate">URL: {image.src}</p>
                <p className="text-red-500">Alt: {image.alt || 'Manquant'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContentPreview = () => {
    if (issueType === 'Images') return null;

    return (
      <div className="space-y-3">
        {item.description && (
          <div>
            <h4 className="font-medium text-sm mb-2">Description :</h4>
            <div className="bg-muted p-3 rounded text-sm max-h-32 overflow-y-auto">
              {item.description.substring(0, 300)}
              {item.description.length > 300 && '...'}
            </div>
          </div>
        )}
        
        {item.short_description && (
          <div>
            <h4 className="font-medium text-sm mb-2">Description courte :</h4>
            <div className="bg-muted p-3 rounded text-sm">
              {item.short_description}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Aperçu de l'élément</span>
            <Badge variant="secondary">{item.type}</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-96">
          <div className="space-y-4">
            {/* Header info */}
            <div className="border-b pb-3">
              <h3 className="font-medium">{getItemDisplayName()}</h3>
              <p className="text-sm text-muted-foreground">ID: {item.id}</p>
              {item.url && (
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-primary hover:underline mt-1"
                >
                  Voir en ligne <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              )}
            </div>

            {/* Issue-specific preview */}
            {renderImagePreview()}
            {renderContentPreview()}

            {/* Issue context */}
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
              <h4 className="font-medium text-sm text-yellow-800 mb-1">
                Problème détecté : {issueType}
              </h4>
              <p className="text-sm text-yellow-700">
                {issueType === 'Images' && 'Certaines images n\'ont pas de texte alternatif'}
                {issueType === 'Contenu' && 'Le contenu pourrait être enrichi et mieux structuré'}
                {issueType === 'SEO' && 'Les métadonnées SEO peuvent être optimisées'}
                {issueType === 'Structure' && 'Le contenu manque de structure (titres, listes)'}
                {issueType === 'Génération IA' && 'Le contenu peut être amélioré avec l\'IA'}
                {issueType === 'Maillage interne' && 'Des liens internes peuvent être ajoutés'}
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}