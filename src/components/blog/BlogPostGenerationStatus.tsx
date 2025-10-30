import React from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, FileText, Image, Link, HelpCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BlogPostGenerationStatusProps {
  post: {
    id: string;
    title: string;
    generation_status: string;
    created_at: string;
  };
  onComplete?: () => void;
}

export function BlogPostGenerationStatus({ post }: BlogPostGenerationStatusProps) {
  const steps = [
    { key: 'content', label: 'Génération du contenu', icon: FileText },
    { key: 'images', label: 'Création des images', icon: Image },
    { key: 'links', label: 'Ajout de liens internes', icon: Link },
    { key: 'faq', label: 'Génération FAQ', icon: HelpCircle },
  ];

  // Estimation approximative basée sur le temps écoulé
  const getEstimatedProgress = () => {
    const createdAt = new Date(post.created_at).getTime();
    const now = Date.now();
    const elapsed = (now - createdAt) / 1000; // secondes
    
    // Progression estimée: ~60-90 secondes au total
    const progress = Math.min((elapsed / 75) * 100, 95);
    
    if (elapsed < 20) return 0; // Content (0-25%)
    if (elapsed < 40) return 1; // Images (25-50%)
    if (elapsed < 55) return 2; // Links (50-75%)
    return 3; // FAQ (75-95%)
  };

  const currentStep = getEstimatedProgress();

  return (
    <Card className="p-6 mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="relative">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-4 w-4 bg-primary/20 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-foreground truncate">
              {post.title}
            </h3>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              En cours de création
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            L'article est en cours de génération. Cela prend généralement 60-90 secondes.
          </p>
          
          {/* Progress Steps */}
          <div className="space-y-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              
              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-3 text-sm ${
                    isCompleted ? 'text-primary' : isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4 flex-shrink-0 opacity-50" />
                  )}
                  <span className={isCompleted ? 'font-medium' : ''}>
                    {step.label}
                  </span>
                  {isCompleted && (
                    <span className="text-xs text-primary">✓</span>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-1000 ease-out"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}