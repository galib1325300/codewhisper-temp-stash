import React, { useState, useEffect } from 'react';
import { 
  Wand2, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Link2,
  Layers
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import LoadingState from '../ui/loading-state';

interface SEOOptimizerProps {
  productId?: string;
  shopId?: string;
  className?: string;
}

interface OptimizationTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  impact: 'low' | 'medium' | 'high';
  progress: number;
  result?: string;
  issueType: string;
  affectedCount: number;
  icon: React.ReactNode;
}

interface DiagnosticIssue {
  type: string;
  severity: string;
  category: string;
  description: string;
  affectedItems: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

interface Diagnostic {
  id: string;
  score: number;
  issues: DiagnosticIssue[] | any;
}

const SEOOptimizer: React.FC<SEOOptimizerProps> = ({
  productId,
  shopId,
  className = ''
}) => {
  const [tasks, setTasks] = useState<OptimizationTask[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [initialScore, setInitialScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    if (shopId) {
      loadDiagnostic();
    }
  }, [shopId]);

  const loadDiagnostic = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('seo_diagnostics')
        .select('*')
        .eq('shop_id', shopId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDiagnostic(data);
        setInitialScore(data.score || 0);
        setFinalScore(data.score || 0);
        generateTasks(data);
      }
    } catch (error) {
      console.error('Error loading diagnostic:', error);
      toast.error('Erreur lors du chargement du diagnostic');
    } finally {
      setLoading(false);
    }
  };

  const generateTasks = (diag: Diagnostic) => {
    const taskMap = new Map<string, OptimizationTask>();

    diag.issues?.forEach((issue) => {
      const count = issue.affectedItems?.length || 0;
      if (count === 0) return;

      const issueKey = issue.type;
      if (!taskMap.has(issueKey)) {
        taskMap.set(issueKey, {
          id: issueKey,
          title: getTaskTitle(issue.type),
          description: issue.description,
          status: 'pending',
          impact: issue.severity === 'error' ? 'high' : issue.severity === 'warning' ? 'medium' : 'low',
          progress: 0,
          issueType: issue.type,
          affectedCount: count,
          icon: getTaskIcon(issue.type)
        });
      }
    });

    setTasks(Array.from(taskMap.values()));
  };

  const getTaskTitle = (type: string): string => {
    const titles: Record<string, string> = {
      'Images': 'Optimisation des images',
      'Contenu': 'Génération de descriptions structurées',
      'SEO': 'Optimisation des méta-descriptions',
      'Structure': 'Amélioration de la structure HTML',
      'Maillage interne': 'Ajout de liens internes',
      'Génération IA': 'Génération de contenu IA complet'
    };
    return titles[type] || `Optimisation ${type}`;
  };

  const getTaskIcon = (type: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      'Images': <ImageIcon className="w-4 h-4" />,
      'Contenu': <FileText className="w-4 h-4" />,
      'SEO': <Sparkles className="w-4 h-4" />,
      'Structure': <Layers className="w-4 h-4" />,
      'Maillage interne': <Link2 className="w-4 h-4" />,
      'Génération IA': <Wand2 className="w-4 h-4" />
    };
    return icons[type] || <FileText className="w-4 h-4" />;
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-destructive" />;
      default: return null;
    }
  };

  const runOptimization = async () => {
    if (!diagnostic || !shopId) return;
    
    setIsRunning(true);
    let totalFixed = 0;

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      setTasks(prev => prev.map(t => 
        t.id === task.id 
          ? { ...t, status: 'running', progress: 0 }
          : t
      ));

      try {
        // Get affected items for this issue type
        const issue = diagnostic.issues?.find(iss => iss.type === task.issueType);
        const affectedItems = issue?.affectedItems?.map(item => item.id) || [];

        // Call resolve-seo-issues edge function
        const { data, error } = await supabase.functions.invoke('resolve-seo-issues', {
          body: {
            shopId,
            diagnosticId: diagnostic.id,
            issueType: task.issueType,
            affectedItems
          }
        });

        if (error) throw error;

        totalFixed += affectedItems.length;

        setTasks(prev => prev.map(t => 
          t.id === task.id 
            ? { 
                ...t, 
                status: 'completed', 
                progress: 100, 
                result: `${affectedItems.length} éléments optimisés avec succès`
              }
            : t
        ));
      } catch (error) {
        console.error(`Error resolving ${task.issueType}:`, error);
        setTasks(prev => prev.map(t => 
          t.id === task.id 
            ? { ...t, status: 'error', result: 'Erreur lors de l\'optimisation' }
            : t
        ));
      }

      // Simulate progress for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Reload diagnostic to get updated score
    await loadDiagnostic();
    
    setIsRunning(false);
    toast.success(`Optimisation terminée ! ${totalFixed} éléments optimisés.`);
  };

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalProgress = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  if (loading) {
    return <LoadingState text="Chargement de l'optimiseur..." />;
  }

  if (!diagnostic || tasks.length === 0) {
    return (
      <Card className="card-elevated">
        <CardContent className="p-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Aucune optimisation disponible</h3>
          <p className="text-muted-foreground">
            Lancez d'abord un diagnostic SEO pour identifier les opportunités d'optimisation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-primary" />
            Optimiseur SEO Intelligent
          </CardTitle>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              Optimisation automatique basée sur l'IA pour améliorer votre référencement
            </p>
            <Badge variant="secondary" className="flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              Impact SEO Élevé
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div>
                <p className="text-sm font-medium">Progression globale</p>
                <p className="text-xs text-muted-foreground">
                  {completedTasks}/{tasks.length} tâches terminées
                </p>
              </div>
            </div>
            <Button 
              onClick={runOptimization}
              disabled={isRunning || completedTasks === tasks.length}
              className="bg-gradient-to-r from-primary to-primary-glow"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Optimisation...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Lancer l'optimisation
                </>
              )}
            </Button>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="grid grid-cols-1 gap-4">
        {tasks.map((task) => (
          <Card key={task.id} className="card-elevated">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-accent">
                    {task.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-foreground">{task.title}</h3>
                      {getStatusIcon(task.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {task.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {task.affectedCount} élément{task.affectedCount > 1 ? 's' : ''} concerné{task.affectedCount > 1 ? 's' : ''}
                    </p>
                    {task.result && (
                      <div className="mt-3 p-3 bg-accent/50 rounded-lg">
                        <p className="text-xs text-foreground font-mono">
                          {task.result}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getImpactColor(task.impact)}`} />
                  <span className="text-xs text-muted-foreground capitalize">
                    Impact {task.impact}
                  </span>
                </div>
              </div>
              
              {task.status === 'running' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Progression</span>
                    <span>{task.progress}%</span>
                  </div>
                  <Progress value={task.progress} className="h-1" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SEO Score Prediction */}
      {completedTasks > 0 && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-success" />
              Résultats de l'optimisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-success/10 to-success/5 rounded-lg">
                <div className="text-2xl font-bold text-success mb-1">
                  {finalScore - initialScore > 0 ? '+' : ''}{finalScore - initialScore}
                </div>
                <div className="text-sm text-muted-foreground">Points de score SEO</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-info/10 to-info/5 rounded-lg">
                <div className="text-2xl font-bold text-info mb-1">{finalScore}/100</div>
                <div className="text-sm text-muted-foreground">Score SEO actuel</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-warning/10 to-warning/5 rounded-lg">
                <div className="text-2xl font-bold text-warning mb-1">{completedTasks}</div>
                <div className="text-sm text-muted-foreground">Tâches complétées</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SEOOptimizer;