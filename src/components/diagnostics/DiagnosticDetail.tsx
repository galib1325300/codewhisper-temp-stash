import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, AlertTriangle, AlertCircle, Info, ExternalLink, Settings, Zap } from 'lucide-react';
import LoadingState from '@/components/ui/loading-state';

interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  recommendation: string;
  affected_items?: any[];
  resource_type?: 'product' | 'collection' | 'blog' | 'general';
  action_available?: boolean;
}

interface DiagnosticData {
  id: string;
  score: number;
  total_issues: number;
  errors_count: number;
  warnings_count: number;
  info_count: number;
  issues: SEOIssue[];
  recommendations: string[];
  summary: any;
  created_at: string;
}

export default function DiagnosticDetail() {
  const { id: shopId, diagnosticId } = useParams();
  const [diagnostic, setDiagnostic] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    if (diagnosticId) {
      loadDiagnostic();
    }
  }, [diagnosticId]);

  const loadDiagnostic = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_diagnostics')
        .select('*')
        .eq('id', diagnosticId)
        .single();

      if (error) throw error;
      setDiagnostic(data as unknown as DiagnosticData);
    } catch (error) {
      console.error('Error loading diagnostic:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filterIssues = (issues: SEOIssue[]) => {
    if (activeFilter === 'all') return issues;
    if (activeFilter === 'errors') return issues.filter(i => i.type === 'error');
    if (activeFilter === 'warnings') return issues.filter(i => i.type === 'warning');
    if (activeFilter === 'info') return issues.filter(i => i.type === 'info');
    return issues.filter(i => i.resource_type === activeFilter);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <LoadingState text="Chargement du diagnostic..." />;
  }

  if (!diagnostic) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-foreground mb-2">Diagnostic non trouvé</h3>
        <p className="text-muted-foreground mb-4">Le diagnostic que vous recherchez n'existe pas.</p>
        <Link to={`/admin/shops/${shopId}/diagnostics`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux diagnostics
          </Button>
        </Link>
      </div>
    );
  }

  const filteredIssues = filterIssues(diagnostic.issues);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/admin/shops/${shopId}/diagnostics`}>
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux diagnostics
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Diagnostic SEO #{diagnostic.id.slice(0, 8)}
          </h1>
          <p className="text-muted-foreground">
            Généré le {formatDate(diagnostic.created_at)}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${getScoreColor(diagnostic.score)}`}>
            {diagnostic.score}/100
          </div>
          <p className="text-sm text-muted-foreground">Score SEO</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{diagnostic.errors_count}</p>
                <p className="text-sm text-muted-foreground">Erreurs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-yellow-600">{diagnostic.warnings_count}</p>
                <p className="text-sm text-muted-foreground">Avertissements</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Info className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{diagnostic.info_count}</p>
                <p className="text-sm text-muted-foreground">Informations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{diagnostic.total_issues}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Tabs defaultValue="all" onValueChange={setActiveFilter}>
        <TabsList>
          <TabsTrigger value="all">Tous ({diagnostic.total_issues})</TabsTrigger>
          <TabsTrigger value="errors">Erreurs ({diagnostic.errors_count})</TabsTrigger>
          <TabsTrigger value="warnings">Avertissements ({diagnostic.warnings_count})</TabsTrigger>
          <TabsTrigger value="info">Infos ({diagnostic.info_count})</TabsTrigger>
          <TabsTrigger value="product">Produits</TabsTrigger>
          <TabsTrigger value="collection">Collections</TabsTrigger>
          <TabsTrigger value="blog">Blog</TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="space-y-4">
          {filteredIssues.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Aucun problème trouvé dans cette catégorie.</p>
              </CardContent>
            </Card>
          ) : (
            filteredIssues.map((issue, index) => (
              <Card key={index} className={`border ${getIssueColor(issue.type)}`}>
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
                    {issue.action_available && (
                      <Button size="sm" variant="outline">
                        <Zap className="w-4 h-4 mr-2" />
                        Résoudre
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
                            <Button size="sm" variant="ghost" className="h-auto p-1">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
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
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommandations générales</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {diagnostic.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-primary">•</span>
                <span className="text-sm">{rec}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}