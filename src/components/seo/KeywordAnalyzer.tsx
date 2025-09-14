import React, { useState, useEffect } from 'react';
import { 
  Search, 
  TrendingUp, 
  Target, 
  Eye,
  DollarSign,
  BarChart3,
  Filter,
  Download,
  Plus,
  Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface Keyword {
  id: string;
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  trend: 'up' | 'down' | 'stable';
  competition: 'low' | 'medium' | 'high';
  opportunities: number;
  currentRank?: number;
  targetRank?: number;
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
  const [keywords, setKeywords] = useState<Keyword[]>([
    {
      id: '1',
      keyword: 'chaussures de sport',
      volume: 12500,
      difficulty: 45,
      cpc: 1.25,
      trend: 'up',
      competition: 'medium',
      opportunities: 8,
      currentRank: 25,
      targetRank: 10
    },
    {
      id: '2',
      keyword: 'baskets premium',
      volume: 8900,
      difficulty: 35,
      cpc: 2.15,
      trend: 'stable',
      competition: 'low',
      opportunities: 12,
      currentRank: 15,
      targetRank: 5
    },
    {
      id: '3',
      keyword: 'chaussures confort',
      volume: 6700,
      difficulty: 28,
      cpc: 1.80,
      trend: 'up',
      competition: 'low',
      opportunities: 15,
      currentRank: 35,
      targetRank: 15
    },
    {
      id: '4',
      keyword: 'sneakers mode',
      volume: 15200,
      difficulty: 62,
      cpc: 3.45,
      trend: 'down',
      competition: 'high',
      opportunities: 5,
      currentRank: 45,
      targetRank: 20
    }
  ]);

  const [newKeyword, setNewKeyword] = useState('');
  const [sortBy, setSortBy] = useState<'volume' | 'difficulty' | 'cpc' | 'rank'>('volume');
  const [filterBy, setFilterBy] = useState<'all' | 'low' | 'medium' | 'high'>('all');

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
        case 'rank': return (a.currentRank || 0) - (b.currentRank || 0);
        default: return 0;
      }
    });

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;

    // Simuler l'analyse d'un nouveau mot-clé
    const mockKeyword: Keyword = {
      id: Date.now().toString(),
      keyword: newKeyword,
      volume: Math.floor(Math.random() * 20000),
      difficulty: Math.floor(Math.random() * 100),
      cpc: Math.random() * 5,
      trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as any,
      competition: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
      opportunities: Math.floor(Math.random() * 20),
      currentRank: Math.floor(Math.random() * 50) + 1,
      targetRank: Math.floor(Math.random() * 10) + 1
    };

    setKeywords(prev => [mockKeyword, ...prev]);
    setNewKeyword('');
  };

  const avgVolume = keywords.reduce((sum, k) => sum + k.volume, 0) / keywords.length;
  const avgDifficulty = keywords.reduce((sum, k) => sum + k.difficulty, 0) / keywords.length;
  const totalOpportunities = keywords.reduce((sum, k) => sum + k.opportunities, 0);

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
          <CardTitle className="flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Analyseur de Mots-clés
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

              <Button variant="outline">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keywords Table */}
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
                        <DollarSign className="w-3 h-3 mr-1 text-muted-foreground" />
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
                          <span className="text-muted-foreground">Actuelle:</span> #{keyword.currentRank}
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Cible:</span> #{keyword.targetRank}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KeywordAnalyzer;