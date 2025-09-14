import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  loading?: boolean;
  className?: string;
  variant?: 'default' | 'gradient' | 'outlined';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  loading = false,
  className,
  variant = 'default'
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return TrendingUp;
    if (trend.value < 0) return TrendingDown;
    return Minus;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-success';
    if (trend.value < 0) return 'text-error';
    return 'text-muted-foreground';
  };

  const cardClasses = {
    default: 'bg-card border border-border',
    gradient: 'bg-gradient-to-br from-primary/5 to-info/5 border border-primary/10',
    outlined: 'bg-transparent border-2 border-primary/20 hover:border-primary/40'
  };

  const TrendIcon = getTrendIcon();

  return (
    <div className={cn(
      "p-6 rounded-lg shadow-sm hover:shadow-md transition-all duration-300",
      cardClasses[variant],
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {Icon && (
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        {loading ? (
          <div className="h-8 bg-muted loading-shimmer rounded" />
        ) : (
          <p className="text-3xl font-bold text-foreground">{value}</p>
        )}
        
        {trend && !loading && (
          <div className={cn("flex items-center text-sm", getTrendColor())}>
            {TrendIcon && <TrendIcon className="w-4 h-4 mr-1" />}
            <span className="font-medium">
              {trend.value > 0 ? '+' : ''}{trend.value}%
            </span>
            {trend.label && (
              <span className="ml-1 text-muted-foreground">
                {trend.label}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;