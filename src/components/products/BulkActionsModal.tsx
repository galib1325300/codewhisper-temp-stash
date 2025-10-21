import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface BulkActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onExecute: (action: string, language: string, preserveInternalLinks: boolean) => void;
}

export default function BulkActionsModal({ 
  isOpen, 
  onClose, 
  selectedCount,
  onExecute 
}: BulkActionsModalProps) {
  const [selectedAction, setSelectedAction] = useState('complete');
  const [language, setLanguage] = useState('fr');
  const [preserveInternalLinks, setPreserveInternalLinks] = useState(false);

  const actions = [
    { id: 'complete', label: 'Générer les fiches produits complètes', credits: 60 },
    { id: 'long_descriptions', label: 'Générer les descriptions longues uniquement', credits: 20 },
    { id: 'short_descriptions', label: 'Générer les descriptions courtes', credits: 10 },
    { id: 'alt_images', label: 'Générer les alt images', credits: 15 },
    { id: 'internal_linking', label: 'Ajouter le maillage interne', credits: 15 },
    { id: 'improve_images', label: 'Améliorer la qualité des images', credits: 30, disabled: true, badge: 'Bientôt disponible' },
    { id: 'translate', label: 'Traduire le contenu existant', credits: 25 },
  ];

  const languages = [
    { value: 'fr', label: 'Français' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'de', label: 'Deutsch' },
    { value: 'it', label: 'Italiano' },
    { value: 'pt', label: 'Português' },
  ];

  const estimatedCost = useMemo(() => {
    const action = actions.find(a => a.id === selectedAction);
    if (!action) return 0;
    return action.credits * selectedCount;
  }, [selectedAction, selectedCount]);

  const handleExecute = () => {
    onExecute(selectedAction, language, preserveInternalLinks);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Actions en lot</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {selectedCount} produit(s) sélectionné(s)
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Choisissez une action :
            </Label>
            <RadioGroup value={selectedAction} onValueChange={setSelectedAction}>
              <div className="space-y-3">
                {actions.map((action) => (
                  <div key={action.id} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={action.id} 
                      id={action.id} 
                      disabled={action.disabled}
                    />
                    <Label 
                      htmlFor={action.id} 
                      className={`font-normal cursor-pointer flex-1 flex items-center gap-2 ${action.disabled ? 'opacity-50' : ''}`}
                    >
                      {action.label}
                      {action.badge && (
                        <Badge variant="outline" className="text-xs">
                          {action.badge}
                        </Badge>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-2 pt-2 border-t border-border">
            <Checkbox 
              id="preserve-links" 
              checked={preserveInternalLinks}
              onCheckedChange={(checked) => setPreserveInternalLinks(checked as boolean)}
            />
            <Label 
              htmlFor="preserve-links" 
              className="font-normal cursor-pointer"
            >
              Conserver le maillage interne existant
            </Label>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              Langue :
            </Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm font-medium text-foreground">
              Coût estimé : {estimatedCost} crédits
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleExecute}>
            Exécuter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
