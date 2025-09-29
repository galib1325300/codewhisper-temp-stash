import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, CheckSquare, Square, ExternalLink, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import ItemPreviewModal from './ItemPreviewModal';

interface IssueItem {
  id: string;
  name?: string;
  title?: string;
  type: string;
  url?: string;
  images?: Array<{
    src: string;
    alt?: string;
  }>;
  description?: string;
  short_description?: string;
}

interface IssueItemSelectorProps {
  items: IssueItem[];
  selectedItems: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  issueTitle: string;
  issueType: string;
  actionButtonText: string;
  onAction: (selectedIds: string[]) => void;
  isLoading: boolean;
}

export default function IssueItemSelector({
  items,
  selectedItems,
  onSelectionChange,
  issueTitle,
  issueType,
  actionButtonText,
  onAction,
  isLoading
}: IssueItemSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [previewItem, setPreviewItem] = useState<IssueItem | null>(null);
  const itemsPerPage = 20;

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    
    return items.filter(item => {
      const name = item.name || item.title || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [items, searchTerm]);

  // Paginate filtered items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      // Deselect all
      onSelectionChange([]);
    } else {
      // Select all filtered items
      onSelectionChange(filteredItems.map(item => item.id));
    }
  };

  const handleItemToggle = (itemId: string) => {
    const newSelection = selectedItems.includes(itemId)
      ? selectedItems.filter(id => id !== itemId)
      : [...selectedItems, itemId];
    
    onSelectionChange(newSelection);
  };

  const handleAction = () => {
    onAction(selectedItems);
    setIsOpen(false);
  };

  const getItemDisplayName = (item: IssueItem) => {
    return item.name || item.title || `Élément ${item.id.slice(0, 8)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={items.length === 0}
        >
          <CheckSquare className="w-4 h-4 mr-2" />
          Sélectionner éléments ({items.length})
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{issueTitle}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search and bulk actions */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Rechercher par nom..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page when searching
                }}
                className="pl-10"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedItems.length === filteredItems.length ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Tout désélectionner
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Tout sélectionner
                </>
              )}
            </Button>
          </div>

          {/* Selection summary */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedItems.length} élément{selectedItems.length !== 1 ? 's' : ''} sélectionné{selectedItems.length !== 1 ? 's' : ''} sur {filteredItems.length}
              {searchTerm && ` (filtré de ${items.length} total)`}
            </div>
            
            <div className="text-sm text-muted-foreground">
              Page {currentPage} sur {totalPages}
            </div>
          </div>

          {/* Items list */}
          <ScrollArea className="h-96 border rounded-lg">
            <div className="p-4 space-y-2">
              {paginatedItems.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  {searchTerm ? 'Aucun élément trouvé pour cette recherche' : 'Aucun élément disponible'}
                </div>
              ) : (
                paginatedItems.map((item) => (
                  <Card key={item.id} className="border">
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => handleItemToggle(item.id)}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="truncate">
                              <p className="font-medium text-sm truncate">
                                {getItemDisplayName(item)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ID: {item.id.slice(0, 8)}...
                              </p>
                            </div>
                            
                            <div className="flex items-center space-x-2 ml-2">
                              <Badge variant="secondary" className="text-xs">
                                {item.type}
                              </Badge>
                              
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-auto p-1"
                                onClick={() => setPreviewItem(item)}
                                title="Aperçu"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              
                              {item.url && (
                                <Button size="sm" variant="ghost" className="h-auto p-1" asChild>
                                  <a href={item.url} target="_blank" rel="noopener noreferrer" title="Voir en ligne">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>
              
              <span className="text-sm text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant
              </Button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            
            <Button
              onClick={handleAction}
              disabled={selectedItems.length === 0 || isLoading}
            >
              {isLoading ? 'Traitement...' : `${actionButtonText} (${selectedItems.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
      
      <ItemPreviewModal
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        item={previewItem}
        issueType={issueType}
      />
    </Dialog>
  );
}