import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

interface DiagnosticProgressProps {
  diagnosticId: string;
  status: string;
  progress?: number;
  currentTask?: string;
  estimatedTimeRemaining?: number;
}

export default function DiagnosticProgress({
  diagnosticId,
  status,
  progress = 0,
  currentTask = '',
  estimatedTimeRemaining = 0
}: DiagnosticProgressProps) {
  const [currentProgress, setCurrentProgress] = useState(progress);

  useEffect(() => {
    if (status === 'running' && progress < 100) {
      // Simulate progress updates
      const interval = setInterval(() => {
        setCurrentProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 5;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [status, progress]);

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed': return 'Diagnostic terminé';
      case 'running': return 'Analyse en cours...';
      case 'error': return 'Erreur pendant l\'analyse';
      default: return 'En attente de démarrage';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200';
      case 'running': return 'bg-blue-50 border-blue-200';
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.round(seconds / 60)}m`;
  };

  return (
    <Card className={`border ${getStatusColor()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">{getStatusText()}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            #{diagnosticId.slice(0, 8)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {status === 'running' && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Progression</span>
                <span>{Math.round(currentProgress)}%</span>
              </div>
              <Progress value={currentProgress} className="h-2" />
            </div>
            
            {currentTask && (
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <p className="text-sm text-muted-foreground">{currentTask}</p>
              </div>
            )}

            {estimatedTimeRemaining > 0 && (
              <p className="text-xs text-muted-foreground">
                Temps restant estimé : {formatTime(estimatedTimeRemaining)}
              </p>
            )}
          </div>
        )}

        {status === 'completed' && (
          <div className="text-sm text-green-700">
            Analyse terminée avec succès. Consultez les résultats ci-dessous.
          </div>
        )}

        {status === 'error' && (
          <div className="text-sm text-red-700">
            Une erreur s'est produite pendant l'analyse. Veuillez réessayer.
          </div>
        )}

        {status === 'pending' && (
          <div className="text-sm text-muted-foreground">
            Le diagnostic va commencer sous peu...
          </div>
        )}
      </CardContent>
    </Card>
  );
}