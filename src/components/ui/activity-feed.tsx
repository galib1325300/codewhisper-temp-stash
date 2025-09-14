import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  type: 'seo_optimization' | 'product_update' | 'blog_creation' | 'diagnostic' | 'sync';
  title: string;
  description?: string;
  timestamp: Date;
  icon: LucideIcon;
  status: 'success' | 'warning' | 'error' | 'info';
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  showTimestamp?: boolean;
  compact?: boolean;
  className?: string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  showTimestamp = true,
  compact = false,
  className
}) => {
  const getStatusColor = (status: ActivityItem['status']) => {
    switch (status) {
      case 'success':
        return 'text-success border-success bg-success/10';
      case 'warning':
        return 'text-warning border-warning bg-warning/10';
      case 'error':
        return 'text-error border-error bg-error/10';
      default:
        return 'text-info border-info bg-info/10';
    }
  };

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 bg-muted rounded-full mb-4">
          <div className="w-8 h-8 bg-muted-foreground/20 rounded" />
        </div>
        <p className="text-muted-foreground">Aucune activité récente</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {activities.map((activity, index) => {
        const Icon = activity.icon;
        const isLast = index === activities.length - 1;

        return (
          <div key={activity.id} className="relative">
            <div className={cn(
              "flex items-start space-x-4",
              compact ? "pb-2" : "pb-4"
            )}>
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-5 top-12 w-px h-8 bg-border" />
              )}
              
              {/* Icon */}
              <div className={cn(
                "flex-shrink-0 p-2 rounded-full border-2",
                getStatusColor(activity.status)
              )}>
                <Icon className="w-4 h-4" />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-foreground">
                    {activity.title}
                  </h4>
                  {showTimestamp && (
                    <time className="text-xs text-muted-foreground">
                      {formatDistanceToNow(activity.timestamp, { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </time>
                  )}
                </div>
                
                {activity.description && !compact && (
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                )}
                
                {activity.metadata && !compact && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(activity.metadata).map(([key, value]) => (
                      <span
                        key={key}
                        className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs text-muted-foreground"
                      >
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityFeed;