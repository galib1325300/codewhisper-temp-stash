import React from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from './progress';

interface ProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  description?: string;
}

interface ProgressTrackerProps {
  steps: ProgressStep[];
  currentStep?: string;
  showProgress?: boolean;
  variant?: 'horizontal' | 'vertical';
  className?: string;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  steps,
  currentStep,
  showProgress = true,
  variant = 'vertical',
  className
}) => {
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  const getStepIcon = (status: ProgressStep['status'], isActive: boolean) => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-white" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-white" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-white" />;
      default:
        return <div className="w-2 h-2 bg-current rounded-full" />;
    }
  };

  const getStepColor = (status: ProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-success border-success text-success';
      case 'error':
        return 'bg-error border-error text-error';
      case 'in-progress':
        return 'bg-info border-info text-info';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  if (variant === 'horizontal') {
    return (
      <div className={cn("space-y-4", className)}>
        {showProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground">Progression</span>
              <span className="text-muted-foreground">
                {completedSteps}/{steps.length} étapes complétées
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}
        
        <div className="flex items-center space-x-4 overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = step.status === 'completed';
            const isLast = index === steps.length - 1;
            
            return (
              <div key={step.id} className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                      getStepColor(step.status),
                      isActive && "ring-2 ring-primary ring-offset-2"
                    )}
                  >
                    {getStepIcon(step.status, isActive)}
                  </div>
                  
                  <div className="min-w-0">
                    <div className={cn(
                      "text-sm font-medium",
                      isCompleted ? "text-success" : 
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </div>
                    {step.description && (
                      <div className="text-xs text-muted-foreground">
                        {step.description}
                      </div>
                    )}
                  </div>
                </div>
                
                {!isLast && (
                  <div className={cn(
                    "w-8 h-px",
                    isCompleted ? "bg-success" : "bg-border"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {showProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-foreground">Progression</span>
            <span className="text-muted-foreground">
              {completedSteps}/{steps.length} étapes complétées
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      )}
      
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.id} className="relative">
              <div className="flex items-start space-x-4">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-4 top-8 w-px h-8 bg-border" />
                )}
                
                {/* Step indicator */}
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors flex-shrink-0",
                    getStepColor(step.status),
                    isActive && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  {getStepIcon(step.status, isActive)}
                </div>
                
                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "text-sm font-medium",
                    step.status === 'completed' ? "text-success" : 
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </div>
                  {step.description && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressTracker;