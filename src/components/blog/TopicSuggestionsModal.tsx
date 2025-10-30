import React, { useState } from 'react';
import { X, TrendingUp, Target, BarChart, BookOpen, Scale, GraduationCap, List, Filter } from 'lucide-react';
import Button from '../Button';

interface TopicSuggestion {
  topic: string;
  primary_keyword: string;
  secondary_keywords: string[];
  search_volume_estimate: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  opportunity_score: number;
  article_type: 'guide' | 'comparatif' | 'tutoriel' | 'listicle';
  recommended_length: number;
}

interface TopicSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: TopicSuggestion[];
  loading: boolean;
  onSelectTopic: (topic: string, keywords: string) => void;
  niche?: string;
  mainCategories?: string[];
  analyzedProducts?: number;
  analyzedCollections?: number;
}

export default function TopicSuggestionsModal({
  isOpen,
  onClose,
  suggestions,
  loading,
  onSelectTopic,
  niche,
  mainCategories,
  analyzedProducts,
  analyzedCollections,
}: TopicSuggestionsModalProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');

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

  const getArticleTypeIcon = (type: string) => {
    switch (type) {
      case 'guide':
        return <BookOpen className="w-4 h-4" />;
      case 'comparatif':
        return <Scale className="w-4 h-4" />;
      case 'tutoriel':
        return <GraduationCap className="w-4 h-4" />;
      case 'listicle':
        return <List className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getArticleTypeColor = (type: string) => {
    switch (type) {
      case 'guide':
        return 'bg-blue-100 text-blue-700';
      case 'comparatif':
        return 'bg-purple-100 text-purple-700';
      case 'tutoriel':
        return 'bg-green-100 text-green-700';
      case 'listicle':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getArticleTypeLabel = (type: string) => {
    switch (type) {
      case 'guide':
        return 'Guide';
      case 'comparatif':
        return 'Comparatif';
      case 'tutoriel':
        return 'Tutoriel';
      case 'listicle':
        return 'Top/Liste';
      default:
        return type;
    }
  };

  // Filter suggestions
  const filteredSuggestions = suggestions.filter(s => {
    if (filterType !== 'all' && s.article_type !== filterType) return false;
    if (filterDifficulty !== 'all' && s.difficulty !== filterDifficulty) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              Suggestions SEO Intelligentes
            </h2>
            {niche && (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Niche détectée:</span> {niche}
                </p>
                {mainCategories && mainCategories.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Catégories:</span> {mainCategories.join(', ')}
                  </p>
                )}
                {(analyzedProducts || analyzedCollections) && (
                  <p className="text-xs text-muted-foreground">
                    Analyse de {analyzedProducts || 0} produits et {analyzedCollections || 0} collections
                  </p>
                )}
              </div>
            )}
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
              <p className="text-muted-foreground">Analyse intelligente de votre catalogue...</p>
              <p className="text-xs text-muted-foreground mt-2">Génération de suggestions diversifiées avec IA</p>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Filtrer les suggestions</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Type d'article</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-border rounded-lg bg-card focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">Tous les types</option>
                      <option value="guide">📘 Guides</option>
                      <option value="comparatif">⚖️ Comparatifs</option>
                      <option value="tutoriel">🎓 Tutoriels</option>
                      <option value="listicle">📊 Top/Listes</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Difficulté</label>
                    <select
                      value={filterDifficulty}
                      onChange={(e) => setFilterDifficulty(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-border rounded-lg bg-card focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">Toutes difficultés</option>
                      <option value="Easy">🟢 Facile</option>
                      <option value="Medium">🟡 Moyen</option>
                      <option value="Hard">🔴 Difficile</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <span className="text-xs text-muted-foreground px-3 py-1.5">
                      {filteredSuggestions.length} suggestion{filteredSuggestions.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Suggestions list */}
              <div className="space-y-4">
                {filteredSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="border border-border rounded-lg p-5 hover:shadow-lg hover:border-primary/50 transition-all bg-card"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`mt-1 p-2 rounded-lg ${getArticleTypeColor(suggestion.article_type)}`}>
                          {getArticleTypeIcon(suggestion.article_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-foreground flex-1">
                              {suggestion.topic}
                            </h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getArticleTypeColor(suggestion.article_type)} flex items-center gap-1`}>
                              {getArticleTypeIcon(suggestion.article_type)}
                              {getArticleTypeLabel(suggestion.article_type)}
                            </span>
                          </div>
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
                              Opportunité: {suggestion.opportunity_score}/100
                            </span>
                            <span className="text-xs text-muted-foreground">
                              📝 {suggestion.recommended_length} mots
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            🤖 Suggestions IA basées sur votre catalogue • 
            🔍 Analyse concurrentielle Google SERP (top 5) • 
            📊 Optimisées SEO (mots-clés longue traîne)
          </p>
        </div>
      </div>
    </div>
  );
}
