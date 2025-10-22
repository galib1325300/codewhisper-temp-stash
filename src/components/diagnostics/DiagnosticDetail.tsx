import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, AlertTriangle, AlertCircle, Info, Settings } from 'lucide-react';
import LoadingState from '@/components/ui/loading-state';
import IssueActions from './IssueActions';
import DiagnosticProgress from './DiagnosticProgress';
import DiagnosticExport from './DiagnosticExport';

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
  issues: any[];
  recommendations: any[];
  summary: any;
  created_at: string;
  status?: string;
}

export default function DiagnosticDetail() {
  const { id: shopId, diagnosticId } = useParams();
  const [diagnostic, setDiagnostic] = useState<DiagnosticData | null>(null);
  const [shop, setShop] = useState<{ url: string; type: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');

  useEffect(() => {
    if (diagnosticId && shopId) {
      loadDiagnostic();
      loadShop();
    }
  }, [diagnosticId, shopId]);

  const enrichIssuesWithProductData = async (issues: any[]) => {
    // Extract all product IDs from issues
    const productIds = new Set<string>();
    issues.forEach((issue) => {
      if (issue.affected_items && Array.isArray(issue.affected_items)) {
        issue.affected_items.forEach((item: any) => {
          if (item.type === 'product' && item.id) {
            productIds.add(item.id);
          }
        });
      }
    });

    if (productIds.size === 0) return issues;

    // Fetch product slugs from database
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, slug')
        .in('id', Array.from(productIds));

      if (error) throw error;

      // Create a map of product ID to slug
      const productSlugMap = new Map(
        products?.map((p) => [p.id, p.slug]) || []
      );

      // Enrich issues with slugs
      return issues.map((issue) => ({
        ...issue,
        affected_items: issue.affected_items?.map((item: any) => ({
          ...item,
          slug: item.type === 'product' ? productSlugMap.get(item.id) : item.slug,
        })),
      }));
    } catch (error) {
      console.error('Error enriching issues with product data:', error);
      return issues;
    }
  };

  const loadDiagnostic = async () => {
    try {
      const { data, error } = await supabase
        .from('seo_diagnostics')
        .select('*')
        .eq('id', diagnosticId)
        .single();

      if (error) throw error;
      
      let issues = Array.isArray(data.issues) ? data.issues : [];
      
      // Enrich issues with product slugs
      issues = await enrichIssuesWithProductData(issues);
      
      const diagnosticData = {
        ...data,
        issues,
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : []
      };
      
      setDiagnostic(diagnosticData);
    } catch (error) {
      console.error('Error loading diagnostic:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadShop = async () => {
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('url, type')
        .eq('id', shopId)
        .single();

      if (error) throw error;
      setShop(data);
    } catch (error) {
      console.error('Error loading shop:', error);
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

  const filterIssues = (issues: any[]) => {
    let filtered = issues;

    // Filter by status
    if (statusFilter === 'to-resolve') {
      filtered = filtered.filter((i: any) => !i.resolved && !i.in_progress);
    } else if (statusFilter === 'in-progress') {
      filtered = filtered.filter((i: any) => i.in_progress);
    } else if (statusFilter === 'resolved') {
      filtered = filtered.filter((i: any) => i.resolved);
    }

    // Filter by resource type
    if (resourceFilter !== 'all') {
      if (resourceFilter === 'home') {
        filtered = filtered.filter((i: any) => i.resource_type === 'general' || i.category === 'home');
      } else {
        filtered = filtered.filter((i: any) => i.resource_type === resourceFilter);
      }
    }

    return filtered;
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

      {/* Progress Card for Running Diagnostics */}
      {diagnostic.status !== 'completed' && (
        <DiagnosticProgress
          diagnosticId={diagnostic.id}
          status={diagnostic.status}
          progress={diagnostic.status === 'running' ? 75 : 0}
          currentTask={diagnostic.status === 'running' ? 'Analyse des produits et collections...' : undefined}
          estimatedTimeRemaining={diagnostic.status === 'running' ? 45 : 0}
        />
      )}

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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des problèmes à résoudre</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="to-resolve">À résoudre</SelectItem>
                  <SelectItem value="in-progress">En cours de résolution</SelectItem>
                  <SelectItem value="resolved">Résolus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les ressources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les ressources</SelectItem>
                  <SelectItem value="product">Produits</SelectItem>
                  <SelectItem value="collection">Collections</SelectItem>
                  <SelectItem value="blog">Articles</SelectItem>
                  <SelectItem value="home">Page d'accueil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredIssues.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Aucun problème trouvé avec ces filtres.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredIssues.map((issue, index) => {
                // Find the original index in the full issues array
                const originalIndex = diagnostic.issues.findIndex((i: any) => i === issue);
                
                return (
                  <IssueActions
                    key={index}
                    issue={issue}
                    shopId={shopId || ''}
                    diagnosticId={diagnosticId || ''}
                    shopUrl={shop?.url}
                    shopType={shop?.type}
                    issueIndex={originalIndex}
                    onIssueResolved={() => {
                      loadDiagnostic();
                    }}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Section */}
      <DiagnosticExport 
        diagnostic={diagnostic} 
        shopName="Votre boutique" 
      />
    </div>
  );
}