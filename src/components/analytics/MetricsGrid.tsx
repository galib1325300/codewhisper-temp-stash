import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import StatCard from '../ui/stat-card';

interface Metric {
  id: string;
  title: string;
  value: string | number;
  previousValue?: number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  loading?: boolean;
  variant?: 'default' | 'gradient' | 'outlined';
  format?: 'number' | 'currency' | 'percentage';
}

interface MetricsGridProps {
  metrics: Metric[];
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}

const MetricsGrid: React.FC<MetricsGridProps> = ({ 
  metrics, 
  columns = 4, 
  className = '' 
}) => {
  const gridClasses = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
  };

  const formatValue = (value: string | number, format?: string) => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return `${value}€`;
      case 'percentage':
        return `${value}%`;
      case 'number':
        return value.toLocaleString('fr-FR');
      default:
        return value.toString();
    }
  };

  const calculateTrend = (currentValue: number, previousValue?: number) => {
    if (!previousValue || previousValue === 0) return null;
    
    const change = ((currentValue - previousValue) / previousValue) * 100;
    return {
      value: Math.round(change * 100) / 100,
      label: 'vs période précédente'
    };
  };

  return (
    <div className={`grid ${gridClasses[columns]} gap-6 ${className}`}>
      {metrics.map((metric) => {
        const trend = metric.trend || (
          typeof metric.value === 'number' && metric.previousValue 
            ? calculateTrend(metric.value, metric.previousValue)
            : undefined
        );

        return (
          <StatCard
            key={metric.id}
            title={metric.title}
            value={formatValue(metric.value, metric.format)}
            icon={metric.icon}
            trend={trend}
            loading={metric.loading}
            variant={metric.variant}
          />
        );
      })}
    </div>
  );
};

export default MetricsGrid;