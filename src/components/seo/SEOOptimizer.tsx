import React, { useState } from 'react';
import { 
  Wand2, 
  Target, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Sparkles,
  Search,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';

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
}

const SEOOptimizer: React.FC<SEOOptimizerProps> = ({
  productId,
  shopId,
  className = ''
}) => {
  const [tasks, setTasks] = useState<OptimizationTask[]>([
    {
      id: 'meta-optimization',
      title: 'Optimisation des méta-données',
      description: 'Génération automatique de titres et descriptions SEO optimisées',
      status: 'pending',
      impact: 'high',
      progress: 0
    },
    {
      id: 'keyword-analysis',
      title: 'Analyse des mots-clés',
      description: 'Identification des mots-clés pertinents et analyse de la concurrence',
      status: 'pending',
      impact: 'high',
      progress: 0
    },
    {
      id: 'content-optimization',
      title: 'Optimisation du contenu',
      description: 'Amélioration de la structure et de la densité des mots-clés',
      status: 'pending',
      impact: 'medium',
      progress: 0
    },
    {
      id: 'image-optimization',
      title: 'Optimisation des images',
      description: 'Génération d\'attributs alt et compression automatique',
      status: 'pending',
      impact: 'medium',
      progress: 0
    }
  ]);

  const [isRunning, setIsRunning] = useState(false);

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
    setIsRunning(true);
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      // Marquer la tâche comme en cours
      setTasks(prev => prev.map(t => 
        t.id === task.id 
          ? { ...t, status: 'running', progress: 0 }
          : t
      ));

      // Simuler le progrès
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setTasks(prev => prev.map(t => 
          t.id === task.id 
            ? { ...t, progress }
            : t
        ));
      }

      // Marquer comme terminé avec résultat
      const results = {
        'meta-optimization': 'Titre optimisé : "Chaussures de sport premium - Confort et style" | Description : "Découvrez notre collection de chaussures de sport haut de gamme. Confort optimal, design moderne et durabilité exceptionnelle."',
        'keyword-analysis': 'Mots-clés identifiés : "chaussures sport", "baskets premium", "confort", "style" | Score de difficulté : Moyen (45/100)',
        'content-optimization': 'Densité des mots-clés optimisée : 2.5% | Structure H1-H6 améliorée | 3 suggestions d\'amélioration appliquées',
        'image-optimization': '5 images optimisées | Attributs alt générés | Taille réduite de 35% | WebP converti'
      };

      setTasks(prev => prev.map(t => 
        t.id === task.id 
          ? { 
              ...t, 
              status: 'completed', 
              progress: 100, 
              result: results[t.id as keyof typeof results] 
            }
          : t
      ));
    }

    setIsRunning(false);
    toast.success('Optimisation SEO terminée avec succès !');
  };

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalProgress = (completedTasks / tasks.length) * 100;

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
              disabled={isRunning}
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
                    {task.id === 'meta-optimization' && <FileText className="w-4 h-4" />}
                    {task.id === 'keyword-analysis' && <Search className="w-4 h-4" />}
                    {task.id === 'content-optimization' && <Target className="w-4 h-4" />}
                    {task.id === 'image-optimization' && <ImageIcon className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-foreground">{task.title}</h3>
                      {getStatusIcon(task.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {task.description}
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
              Prédiction d'amélioration SEO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gradient-to-br from-success/10 to-success/5 rounded-lg">
                <div className="text-2xl font-bold text-success mb-1">+25%</div>
                <div className="text-sm text-muted-foreground">Trafic organique estimé</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-info/10 to-info/5 rounded-lg">
                <div className="text-2xl font-bold text-info mb-1">85/100</div>
                <div className="text-sm text-muted-foreground">Score SEO projeté</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-warning/10 to-warning/5 rounded-lg">
                <div className="text-2xl font-bold text-warning mb-1">+15</div>
                <div className="text-sm text-muted-foreground">Positions moyennes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SEOOptimizer;