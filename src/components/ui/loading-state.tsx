import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  variant?: 'spinner' | 'shimmer' | 'skeleton';
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  className, 
  size = 'md', 
  text,
  variant = 'spinner'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  if (variant === 'shimmer') {
    return <div className={cn("loading-shimmer rounded-md", className)} />;
  }

  if (variant === 'skeleton') {
    return <div className={cn("animate-pulse bg-muted rounded-md", className)} />;
  }

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-4", className)}>
      <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );
};

export default LoadingState;