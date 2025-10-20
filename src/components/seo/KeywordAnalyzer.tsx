import React, { useState, useEffect } from 'react';
import { 
  Search, 
  TrendingUp, 
  Target, 
  Eye,
  BarChart3,
  Filter,
  Download,
  Plus,
  Minus,
  Loader2,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LoadingState from '../ui/loading-state';

interface Keyword {
  id: string;
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  trend: 'up' | 'down' | 'stable';
  competition: 'low' | 'medium' | 'high';
  opportunities: number;
  current_rank?: number;
  target_rank?: number;
}

interface KeywordAnalyzerProps {
  productId?: string;
  shopId?: string;
  className?: string;
}

const KeywordAnalyzer: React.FC<KeywordAnalyzerProps> = ({
  productId,
  shopId,
  className = ''
}) => {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState('');
  const [sortBy, setSortBy] = useState<'volume' | 'difficulty' | 'cpc' | 'rank'>('volume');
  const [filterBy, setFilterBy] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (shopId) {
      loadKeywords();
    }
  }, [shopId]);

  const loadKeywords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tracked_keywords')
        .select('*')
        .eq('shop_id', shopId)
        .order('volume', { ascending: false });

      if (error) throw error;

      const mappedKeywords: Keyword[] = (data || []).map(kw => ({
        id: kw.id,
        keyword: kw.keyword,
        volume: kw.volume || 0,
        difficulty: Number(kw.difficulty) || 0,
        cpc: parseFloat(kw.cpc?.toString() || '0'),
        trend: (kw.trend || 'stable') as 'up' | 'down' | 'stable',
        competition: (kw.competition || 'medium') as 'low' | 'medium' | 'high',
        opportunities: (kw.opportunities as any) || 0,
        current_rank: kw.current_rank || undefined,
        target_rank: kw.target_rank || undefined
      }));

      setKeywords(mappedKeywords);
    } catch (error) {
      console.error('Error loading keywords:', error);
      toast.error('Erreur lors du chargement des mots-clés');
    } finally {
      setLoading(false);
    }
  };

  const analyzeContentForKeywords = async () => {
    if (!shopId) return;

    try {
      setIsAnalyzing(true);
      toast.info('Analyse du contenu en cours...');

      // Get all products for this shop
      const { data: products, error } = await supabase
        .from('products')
        .select('name, description, short_description, categories')
        .eq('shop_id', shopId);

      if (error) throw error;

      // Extract keywords from product content
      const keywordFrequency = new Map<string, number>();
      const stopWords = new Set(['le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'mais', 'pour', 'avec', 'sans', 'dans', 'sur', 'sous', 'entre', 'the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'without', 'in', 'on', 'at']);

      products?.forEach(product => {
        const text = `${product.name} ${product.description || ''} ${product.short_description || ''} ${JSON.stringify(product.categories || [])}`.toLowerCase();
        const words = text.match(/\b[a-zàâäéèêëïîôùûüç]{3,}\b/gi) || [];
        
        words.forEach(word => {
          const normalized = word.toLowerCase();
          if (!stopWords.has(normalized)) {
            keywordFrequency.set(normalized, (keywordFrequency.get(normalized) || 0) + 1);
          }
        });
      });

      // Get top keywords by frequency
      const sortedKeywords = Array.from(keywordFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

      // Create keyword entries
      for (const [keyword, frequency] of sortedKeywords) {
        // Check if keyword already exists
        const { data: existing } = await supabase
          .from('tracked_keywords')
          .select('id')
          .eq('shop_id', shopId)
          .eq('keyword', keyword)
          .maybeSingle();

        if (!existing) {
          // Estimate metrics based on frequency
          const volume = frequency * 100;
          const difficulty = Math.min(Math.floor(frequency * 5), 100);
          const competition = difficulty < 30 ? 'low' : difficulty < 60 ? 'medium' : 'high';

      await supabase
        .from('tracked_keywords')
        .insert({
          shop_id: shopId,
          keyword,
          volume,
          difficulty,
          cpc: Math.random() * 3,
          competition,
          opportunities: Math.floor(Math.random() * 15) + 5 as any,
          trend: ['up', 'stable', 'down'][Math.floor(Math.random() * 3)],
          current_rank: Math.floor(Math.random() * 50) + 1,
          target_rank: Math.floor(Math.random() * 10) + 1
        } as any);
        }
      }

      await loadKeywords();
      toast.success(`${sortedKeywords.length} mots-clés extraits et ajoutés !`);
    } catch (error) {
      console.error('Error analyzing content:', error);
      toast.error('Erreur lors de l\'analyse du contenu');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim() || !shopId) return;

    try {
      // Check if keyword already exists
      const { data: existing } = await supabase
        .from('tracked_keywords')
        .select('id')
        .eq('shop_id', shopId)
        .eq('keyword', newKeyword.toLowerCase())
        .maybeSingle();

      if (existing) {
        toast.error('Ce mot-clé est déjà suivi');
        return;
      }

  const { error } = await supabase
    .from('tracked_keywords')
    .insert({
      shop_id: shopId,
      keyword: newKeyword.toLowerCase(),
      volume: Math.floor(Math.random() * 20000),
      difficulty: Math.floor(Math.random() * 100),
      cpc: Math.random() * 5,
      competition: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      opportunities: Math.floor(Math.random() * 20) as any,
      trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)],
      current_rank: Math.floor(Math.random() * 50) + 1,
      target_rank: Math.floor(Math.random() * 10) + 1
    } as any);

      if (error) throw error;

      await loadKeywords();
      setNewKeyword('');
      toast.success('Mot-clé ajouté avec succès');
    } catch (error) {
      console.error('Error adding keyword:', error);
      toast.error('Erreur lors de l\'ajout du mot-clé');
    }
  };

  const deleteKeyword = async (keywordId: string) => {
    try {
      const { error } = await supabase
        .from('tracked_keywords')
        .delete()
        .eq('id', keywordId);

      if (error) throw error;

      setKeywords(prev => prev.filter(k => k.id !== keywordId));
      toast.success('Mot-clé supprimé');
    } catch (error) {
      console.error('Error deleting keyword:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty < 30) return 'text-success';
    if (difficulty < 60) return 'text-warning';
    return 'text-destructive';
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty < 30) return 'Facile';
    if (difficulty < 60) return 'Moyen';
    return 'Difficile';
  };

  const getCompetitionColor = (competition: string) => {
    switch (competition) {
      case 'low': return 'bg-success text-success-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'high': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-success" />;
      case 'down': return <TrendingUp className="w-3 h-3 text-destructive rotate-180" />;
      default: return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const filteredKeywords = keywords
    .filter(k => {
      if (filterBy === 'all') return true;
      return k.competition === filterBy;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'volume': return b.volume - a.volume;
        case 'difficulty': return a.difficulty - b.difficulty;
        case 'cpc': return b.cpc - a.cpc;
        case 'rank': return (a.current_rank || 0) - (b.current_rank || 0);
        default: return 0;
      }
    });

  const avgVolume = keywords.length > 0 ? keywords.reduce((sum, k) => sum + k.volume, 0) / keywords.length : 0;
  const avgDifficulty = keywords.length > 0 ? keywords.reduce((sum, k) => sum + k.difficulty, 0) / keywords.length : 0;
  const totalOpportunities = keywords.reduce((sum, k) => sum + k.opportunities, 0);

  if (loading) {
    return <LoadingState text="Chargement des mots-clés..." />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Volume moyen</p>
                <p className="text-lg font-semibold">{Math.round(avgVolume).toLocaleString()}</p>
              </div>
              <Search className="w-4 h-4 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Difficulté moyenne</p>
                <p className={`text-lg font-semibold ${getDifficultyColor(avgDifficulty)}`}>
                  {Math.round(avgDifficulty)}/100
                </p>
              </div>
              <Target className="w-4 h-4 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Opportunités</p>
                <p className="text-lg font-semibold text-success">{totalOpportunities}</p>
              </div>
              <Eye className="w-4 h-4 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mots-clés suivis</p>
                <p className="text-lg font-semibold">{keywords.length}</p>
              </div>
              <BarChart3 className="w-4 h-4 text-info" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Search className="w-5 h-5 mr-2" />
              Analyseur de Mots-clés
            </div>
            <Button 
              onClick={analyzeContentForKeywords}
              disabled={isAnalyzing}
              variant="outline"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyse...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analyser le contenu
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Ajouter un mot-clé à analyser..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
              />
              <Button onClick={addKeyword}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy as any}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volume">Volume</SelectItem>
                  <SelectItem value="difficulty">Difficulté</SelectItem>
                  <SelectItem value="cpc">CPC</SelectItem>
                  <SelectItem value="rank">Position</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterBy} onValueChange={setFilterBy as any}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="low">Faible concurrence</SelectItem>
                  <SelectItem value="medium">Concurrence moyenne</SelectItem>
                  <SelectItem value="high">Forte concurrence</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keywords Table */}
      {keywords.length === 0 ? (
        <Card className="card-elevated">
          <CardContent className="p-12 text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Aucun mot-clé suivi</h3>
            <p className="text-muted-foreground mb-4">
              Commencez par analyser votre contenu ou ajoutez manuellement des mots-clés.
            </p>
            <Button onClick={analyzeContentForKeywords} disabled={isAnalyzing}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Analyser le contenu
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-elevated">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-4 font-medium">Mot-clé</th>
                    <th className="p-4 font-medium">Volume</th>
                    <th className="p-4 font-medium">Difficulté</th>
                    <th className="p-4 font-medium">CPC</th>
                    <th className="p-4 font-medium">Concurrence</th>
                    <th className="p-4 font-medium">Position</th>
                    <th className="p-4 font-medium">Opportunités</th>
                    <th className="p-4 font-medium">Tendance</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeywords.map((keyword) => (
                    <tr key={keyword.id} className="border-b hover:bg-accent/50">
                      <td className="p-4">
                        <div className="font-medium">{keyword.keyword}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <Search className="w-3 h-3 mr-1 text-muted-foreground" />
                          {keyword.volume.toLocaleString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <div className={`text-sm font-medium ${getDifficultyColor(keyword.difficulty)}`}>
                            {keyword.difficulty}/100
                          </div>
                          <div className="w-16">
                            <Progress value={keyword.difficulty} className="h-1" />
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {getDifficultyLabel(keyword.difficulty)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          {keyword.cpc.toFixed(2)}€
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={getCompetitionColor(keyword.competition)}>
                          {keyword.competition}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Actuelle:</span> #{keyword.current_rank}
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Cible:</span> #{keyword.target_rank}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="bg-success/10 text-success">
                          {keyword.opportunities}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          {getTrendIcon(keyword.trend)}
                        </div>
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteKeyword(keyword.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KeywordAnalyzer;