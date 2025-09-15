import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Play, Pause, TrendingUp, Eye, MousePointer, BarChart3, Plus } from 'lucide-react';

interface ABTestProps {
  shopId?: string;
  className?: string;
}

interface ABTest {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  type: 'title' | 'meta_description' | 'content' | 'cta';
  startDate: string;
  endDate?: string;
  variants: {
    id: string;
    name: string;
    content: string;
    traffic: number;
    conversions: number;
    clicks: number;
    impressions: number;
  }[];
  confidence: number;
  winner?: string;
}

export default function ABTesting({ shopId, className }: ABTestProps) {
  const [activeTab, setActiveTab] = useState('running');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Mock data for demonstration
  const [tests] = useState<ABTest[]>([
    {
      id: '1',
      name: 'Page d\'accueil - Titre principal',
      status: 'running',
      type: 'title',
      startDate: '2024-01-15',
      variants: [
        {
          id: '1a',
          name: 'Variante A (Contrôle)',
          content: 'Boutique en ligne de qualité premium',
          traffic: 50,
          conversions: 145,
          clicks: 2300,
          impressions: 12500
        },
        {
          id: '1b',
          name: 'Variante B',
          content: 'Découvrez nos produits premium exclusifs',
          traffic: 50,
          conversions: 178,
          clicks: 2450,
          impressions: 12800
        }
      ],
      confidence: 87
    },
    {
      id: '2',
      name: 'Fiche produit - Méta description',
      status: 'completed',
      type: 'meta_description',
      startDate: '2024-01-01',
      endDate: '2024-01-14',
      variants: [
        {
          id: '2a',
          name: 'Variante A',
          content: 'Produit de qualité avec livraison rapide',
          traffic: 50,
          conversions: 89,
          clicks: 1850,
          impressions: 9200
        },
        {
          id: '2b',
          name: 'Variante B',
          content: 'Commandez maintenant - Livraison gratuite dès 50€',
          traffic: 50,
          conversions: 124,
          clicks: 2100,
          impressions: 9500
        }
      ],
      confidence: 95,
      winner: '2b'
    }
  ]);

  const getStatusColor = (status: ABTest['status']) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ABTest['status']) => {
    switch (status) {
      case 'running': return <Play className="w-3 h-3" />;
      case 'paused': return <Pause className="w-3 h-3" />;
      case 'completed': return <BarChart3 className="w-3 h-3" />;
      default: return null;
    }
  };

  const calculateConversionRate = (conversions: number, clicks: number) => {
    return clicks > 0 ? ((conversions / clicks) * 100).toFixed(1) : '0.0';
  };

  const calculateCTR = (clicks: number, impressions: number) => {
    return impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : '0.0';
  };

  const filteredTests = tests.filter(test => {
    if (activeTab === 'running') return test.status === 'running';
    if (activeTab === 'completed') return test.status === 'completed';
    if (activeTab === 'drafts') return test.status === 'draft';
    return true;
  });

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tests A/B SEO</h2>
          <p className="text-muted-foreground">Optimisez vos contenus avec des tests comparatifs</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau test
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Créer un nouveau test A/B</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="test-name">Nom du test</Label>
                <Input id="test-name" placeholder="Ex: Page produit - Titre principal" />
              </div>
              <div>
                <Label htmlFor="test-type">Type de test</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Titre (H1)</SelectItem>
                    <SelectItem value="meta_description">Méta description</SelectItem>
                    <SelectItem value="content">Contenu</SelectItem>
                    <SelectItem value="cta">Call-to-action</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="variant-a">Variante A (Contrôle)</Label>
              <Textarea id="variant-a" placeholder="Contenu actuel..." />
            </div>
            
            <div>
              <Label htmlFor="variant-b">Variante B (Test)</Label>
              <Textarea id="variant-b" placeholder="Nouveau contenu à tester..." />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button>Créer le test</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="running">En cours</TabsTrigger>
          <TabsTrigger value="completed">Terminés</TabsTrigger>
          <TabsTrigger value="drafts">Brouillons</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {filteredTests.map((test) => (
            <Card key={test.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{test.name}</CardTitle>
                    <Badge className={getStatusColor(test.status)}>
                      {getStatusIcon(test.status)}
                      <span className="ml-1 capitalize">{test.status}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {test.confidence && (
                      <Badge variant="outline">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {test.confidence}% confiance
                      </Badge>
                    )}
                    {test.status === 'running' && (
                      <Button size="sm" variant="outline">
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Démarré le {new Date(test.startDate).toLocaleDateString()}
                  {test.endDate && ` • Terminé le ${new Date(test.endDate).toLocaleDateString()}`}
                </p>
              </CardHeader>
              
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {test.variants.map((variant) => (
                    <div key={variant.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{variant.name}</h4>
                        <Badge variant="secondary">{variant.traffic}% du trafic</Badge>
                        {test.winner === variant.id && (
                          <Badge className="bg-green-100 text-green-800">
                            🏆 Gagnant
                          </Badge>
                        )}
                      </div>
                      
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm">{variant.content}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Impressions</span>
                            <span className="font-medium">{variant.impressions.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Clics</span>
                            <span className="font-medium">{variant.clicks.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">CTR</span>
                            <span className="font-medium">{calculateCTR(variant.clicks, variant.impressions)}%</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Conversions</span>
                            <span className="font-medium">{variant.conversions}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Taux de conversion</span>
                          <span className="font-medium">{calculateConversionRate(variant.conversions, variant.clicks)}%</span>
                        </div>
                        <Progress 
                          value={parseFloat(calculateConversionRate(variant.conversions, variant.clicks))} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {filteredTests.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Aucun test {activeTab === 'running' ? 'en cours' : activeTab === 'completed' ? 'terminé' : 'en brouillon'}
              </h3>
              <p className="text-muted-foreground">
                Créez votre premier test A/B pour optimiser vos contenus SEO
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}