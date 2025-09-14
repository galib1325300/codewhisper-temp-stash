import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: React.ReactNode;
  variant?: 'default' | 'dot' | 'outline';
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  children,
  variant = 'default',
  className
}) => {
  const statusClasses = {
    success: {
      default: 'status-success',
      dot: 'bg-success-light text-success',
      outline: 'border-success text-success bg-transparent'
    },
    warning: {
      default: 'status-warning',
      dot: 'bg-warning-light text-warning',
      outline: 'border-warning text-warning bg-transparent'
    },
    error: {
      default: 'status-error',
      dot: 'bg-error-light text-error',
      outline: 'border-error text-error bg-transparent'
    },
    info: {
      default: 'status-info',
      dot: 'bg-info-light text-info',
      outline: 'border-info text-info bg-transparent'
    },
    neutral: {
      default: 'bg-muted text-muted-foreground border border-border',
      dot: 'bg-muted text-muted-foreground',
      outline: 'border-border text-muted-foreground bg-transparent'
    }
  };

  const baseClasses = variant === 'default' 
    ? 'px-3 py-1 rounded-full text-sm font-medium' 
    : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border';

  return (
    <span className={cn(
      baseClasses,
      statusClasses[status][variant],
      className
    )}>
      {variant === 'dot' && (
        <div className="w-2 h-2 rounded-full bg-current mr-2 opacity-75" />
      )}
      {children}
    </span>
  );
};

export default StatusBadge;