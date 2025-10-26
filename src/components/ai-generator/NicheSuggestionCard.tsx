import React from 'react';
import { TrendingUp, Users, DollarSign, Check, Package } from 'lucide-react';
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
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg">{niche.name}</h3>
            <Badge variant="secondary" className="text-xs">🚚 Dropshipping</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{niche.description}</p>
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

      {niche.example_products && niche.example_products.length > 0 && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground">Exemples produits AliExpress :</p>
          </div>
          <ul className="text-xs space-y-1">
            {niche.example_products.slice(0, 3).map((product, idx) => (
              <li key={idx} className="text-muted-foreground">• {product}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between">
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
        {niche.aliexpress_availability && (
          <Badge 
            variant={niche.aliexpress_availability === 'high' ? 'default' : 'secondary'}
            className="text-xs"
          >
            Dispo: {niche.aliexpress_availability === 'high' ? 'Haute' : niche.aliexpress_availability === 'medium' ? 'Moyenne' : 'Faible'}
          </Badge>
        )}
      </div>
    </Card>
  );
}
