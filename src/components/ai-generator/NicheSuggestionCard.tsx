import React from 'react';
import { TrendingUp, Users, DollarSign, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Niche } from '@/hooks/useAIGenerator';

interface NicheSuggestionCardProps {
  niche: Niche;
  selected: boolean;
  onSelect: () => void;
}

export default function NicheSuggestionCard({ niche, selected, onSelect }: NicheSuggestionCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-destructive';
    if (score >= 60) return 'text-warning';
    return 'text-success';
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <Card 
      className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
        selected ? 'border-primary border-2 bg-primary/5' : 'border'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">{niche.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{niche.description}</p>
        </div>
        {selected && (
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="text-xs text-muted-foreground">Volume</div>
            <div className="font-semibold">{formatNumber(niche.search_volume)}/mois</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TrendingUp className={`w-4 h-4 ${getScoreColor(niche.competition_score)}`} />
          <div>
            <div className="text-xs text-muted-foreground">Concurrence</div>
            <div className={`font-semibold ${getScoreColor(niche.competition_score)}`}>
              {niche.competition_score}/100
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-success" />
          <div>
            <div className="text-xs text-muted-foreground">Marge</div>
            <div className="font-semibold text-success">{niche.profit_margin_avg}%</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {niche.top_keywords.slice(0, 3).map(keyword => (
          <Badge key={keyword} variant="secondary" className="text-xs">
            {keyword}
          </Badge>
        ))}
        {niche.top_keywords.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{niche.top_keywords.length - 3}
          </Badge>
        )}
      </div>
    </Card>
  );
}
