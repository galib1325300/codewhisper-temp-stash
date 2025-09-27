import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, CheckCircle, Clock, AlertTriangle, ExternalLink, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

  const handleAutoResolve = async () => {
    if (!issue.action_available || !issue.affected_items?.length) return;
    
    setResolving(true);
    let successCount = 0;

    try {
      // Call the new resolve-seo-issues function
      const { data, error } = await supabase.functions.invoke('resolve-seo-issues', {
        body: {
          shopId,
          issueType: issue.category,
          affectedItems: issue.affected_items.map(item => ({
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
        setResolved(true);
        toast.success(`${successCount} éléments traités avec succès`);
        onIssueResolved?.();
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
          {issue.action_available && !resolved && (
            <Button
              size="sm"
              variant={issue.type === 'error' ? 'default' : 'outline'}
              onClick={handleAutoResolve}
              disabled={resolving}
            >
              {resolving ? (
                <Clock className="w-4 h-4 mr-2 animate-spin" />
              ) : resolved ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              {getActionText()}
            </Button>
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
              Éléments concernés ({issue.affected_items.length}) :
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {issue.affected_items.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 bg-background rounded border">
                  <span>{item.name || item.title}</span>
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
              {issue.affected_items.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  ... et {issue.affected_items.length - 5} autres
                </p>
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