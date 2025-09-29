import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, CheckCircle, Clock, AlertTriangle, ExternalLink, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import IssueItemSelector from './IssueItemSelector';

interface IssueActionsProps {
  issue: {
    type: 'error' | 'warning' | 'info';
    category: string;
    title: string;
    description: string;
    recommendation: string;
    affected_items?: any[];
    resource_type?: 'product' | 'collection' | 'blog' | 'general';
    action_available?: boolean;
  };
  shopId: string;
  onIssueResolved?: () => void;
}

export default function IssueActions({ issue, shopId, onIssueResolved }: IssueActionsProps) {
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [resolvedItems, setResolvedItems] = useState<string[]>([]); // Track individually resolved items

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <ExternalLink className="w-5 h-5 text-blue-500" />;
      default:
        return <ExternalLink className="w-5 h-5 text-gray-500" />;
    }
  };

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getActionText = () => {
    if (resolved) return 'Résolu';
    if (resolving) return 'Résolution...';
    
    switch (issue.category) {
      case 'Images':
        return 'Générer textes alt';
      case 'Contenu':
        return 'Générer descriptions';
      case 'SEO':
        return 'Optimiser SEO';
      case 'Structure':
        return 'Structurer contenu';
      case 'Génération IA':
        return 'Générer avec IA';
      case 'Maillage interne':
        return 'Ajouter liens';
      default:
        return 'Résoudre automatiquement';
    }
  };

  const handleAutoResolve = async (itemIds: string[]) => {
    if (!issue.action_available || !issue.affected_items?.length || itemIds.length === 0) return;
    
    setResolving(true);
    let successCount = 0;

    try {
      // Filter affected items to only process selected ones
      const selectedAffectedItems = issue.affected_items.filter(item => 
        itemIds.includes(item.id)
      );

      // Call the resolve-seo-issues function
      const { data, error } = await supabase.functions.invoke('resolve-seo-issues', {
        body: {
          shopId,
          issueType: issue.category,
          affectedItems: selectedAffectedItems.map(item => ({
            id: item.id,
            type: item.type,
            name: item.name || item.title
          }))
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success) {
        successCount = data.results.success;
        
        // Track which items were successfully resolved
        const successfullyResolvedIds = data.results.details
          .filter((detail: any) => detail.success)
          .map((detail: any) => detail.id);
        
        setResolvedItems(prev => [...prev, ...successfullyResolvedIds]);
        
        // Only mark the entire issue as resolved if ALL items have been processed
        const remainingItems = issue.affected_items?.filter(item => 
          !resolvedItems.includes(item.id) && !successfullyResolvedIds.includes(item.id)
        ) || [];
        
        if (remainingItems.length === 0) {
          setResolved(true);
          onIssueResolved?.();
        }
        
        toast.success(`${successCount} éléments traités avec succès sur ${selectedAffectedItems.length} sélectionnés`);
        setSelectedItems([]); // Reset selection
      } else {
        toast.error(data?.error || 'Erreur lors de la résolution automatique');
      }
    } catch (error) {
      console.error('Error in auto-resolve:', error);
      toast.error('Erreur lors de la résolution automatique');
    } finally {
      setResolving(false);
    }
  };

  return (
    <Card className={`border ${getIssueColor(issue.type)}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {getIssueIcon(issue.type)}
            <div>
              <CardTitle className="text-lg">{issue.title}</CardTitle>
              <Badge variant="outline" className="mt-1">
                {issue.category}
              </Badge>
            </div>
          </div>
          {issue.action_available && !resolved && issue.affected_items && issue.affected_items.length > 0 && (
            <IssueItemSelector
              items={issue.affected_items.filter(item => !resolvedItems.includes(item.id))} // Filter out resolved items
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
              issueTitle={issue.title}
              issueType={issue.category}
              actionButtonText={getActionText()}
              onAction={handleAutoResolve}
              isLoading={resolving}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-3">{issue.description}</p>
        <div className="bg-muted p-3 rounded-lg mb-3">
          <p className="text-sm"><strong>Recommandation :</strong> {issue.recommendation}</p>
        </div>
        
        {issue.affected_items && issue.affected_items.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">
              Éléments concernés ({issue.affected_items.length - resolvedItems.length} restants sur {issue.affected_items.length}) :
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {issue.affected_items.filter(item => !resolvedItems.includes(item.id)).slice(0, 3).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 bg-background rounded border">
                  <span className="truncate">{item.name || item.title}</span>
                  <div className="flex items-center space-x-1">
                    <Badge variant="secondary" className="text-xs">
                      {item.type}
                    </Badge>
                    <Button size="sm" variant="ghost" className="h-auto p-1">
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {issue.affected_items.filter(item => !resolvedItems.includes(item.id)).length > 3 && (
                <div className="text-sm text-muted-foreground p-2 bg-muted rounded border text-center">
                  ... et {issue.affected_items.filter(item => !resolvedItems.includes(item.id)).length - 3} autres éléments
                  <br />
                  <span className="text-xs">Utilisez le sélecteur ci-dessus pour voir tous les éléments</span>
                </div>
              )}
              
              {/* Show resolved items */}
              {resolvedItems.length > 0 && (
                <div className="border-t pt-2 mt-2">
                  <p className="text-sm font-medium text-green-600 mb-1">
                    Éléments traités ({resolvedItems.length}) :
                  </p>
                  {issue.affected_items?.filter(item => resolvedItems.includes(item.id)).slice(0, 2).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm p-2 bg-green-50 rounded border border-green-200">
                      <span className="truncate">{item.name || item.title}</span>
                      <div className="flex items-center space-x-1">
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          Résolu
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {resolvedItems.length > 2 && (
                    <div className="text-xs text-green-600 text-center mt-1">
                      ... et {resolvedItems.length - 2} autres éléments résolus
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {resolved && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-800">
                Problème résolu automatiquement
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}