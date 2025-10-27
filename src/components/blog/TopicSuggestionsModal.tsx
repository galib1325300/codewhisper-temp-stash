import React from 'react';
import { X, TrendingUp, Target, BarChart } from 'lucide-react';
import Button from '../Button';

interface TopicSuggestion {
  topic: string;
  primary_keyword: string;
  secondary_keywords: string[];
  search_volume_estimate: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  opportunity_score: number;
  top_competitors: string[];
}

interface TopicSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: TopicSuggestion[];
  loading: boolean;
  onSelectTopic: (topic: string, keywords: string) => void;
}

export default function TopicSuggestionsModal({
  isOpen,
  onClose,
  suggestions,
  loading,
  onSelectTopic,
}: TopicSuggestionsModalProps) {
  if (!isOpen) return null;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-emerald-100 text-emerald-700';
      case 'Medium':
        return 'bg-amber-100 text-amber-700';
      case 'Hard':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getOpportunityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 font-semibold';
    if (score >= 65) return 'text-amber-600 font-medium';
    return 'text-muted-foreground';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              Suggestions de sujets SEO
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Sujets optimisés basés sur votre niche et les tendances de recherche
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Analyse de votre niche en cours...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="border border-border rounded-lg p-5 hover:shadow-lg hover:border-primary/50 transition-all bg-card"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="mt-1 p-2 bg-primary/10 rounded-lg">
                          <Target className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {suggestion.topic}
                          </h3>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                              <BarChart className="w-4 h-4" />
                              {suggestion.search_volume_estimate}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(suggestion.difficulty)}`}>
                              {suggestion.difficulty === 'Easy' && '🟢 Facile'}
                              {suggestion.difficulty === 'Medium' && '🟡 Moyen'}
                              {suggestion.difficulty === 'Hard' && '🔴 Difficile'}
                            </span>
                            <span className={`text-sm ${getOpportunityColor(suggestion.opportunity_score)}`}>
                              Score: {suggestion.opportunity_score}/100
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div>
                          <span className="font-medium text-foreground">Mot-clé principal:</span>
                          <p className="text-muted-foreground mt-1">
                            <code className="bg-muted px-2 py-1 rounded text-xs">
                              {suggestion.primary_keyword}
                            </code>
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-foreground">Mots-clés secondaires:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {suggestion.secondary_keywords.map((kw, i) => (
                              <code key={i} className="bg-muted px-2 py-1 rounded text-xs text-muted-foreground">
                                {kw}
                              </code>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        const allKeywords = [
                          suggestion.primary_keyword,
                          ...suggestion.secondary_keywords,
                        ].join(', ');
                        onSelectTopic(suggestion.topic, allKeywords);
                      }}
                      size="sm"
                      className="whitespace-nowrap"
                    >
                      Utiliser ce sujet
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            💡 Les suggestions sont basées sur l'analyse de votre catalogue produit et les tendances SEO
          </p>
        </div>
      </div>
    </div>
  );
}
