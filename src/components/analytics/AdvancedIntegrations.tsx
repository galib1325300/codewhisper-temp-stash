import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AlertCircle, CheckCircle, ExternalLink, Settings, BarChart3, Search, TrendingUp, Zap } from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  status: 'active' | 'error' | 'pending';
  lastSync?: string;
  metrics?: {
    label: string;
    value: string;
  }[];
}

interface AdvancedIntegrationsProps {
  shopId?: string;
  className?: string;
}

export default function AdvancedIntegrations({ shopId, className }: AdvancedIntegrationsProps) {
  const [integrations] = useState<Integration[]>([
    {
      id: 'google-analytics',
      name: 'Google Analytics 4',
      description: 'Analyse du trafic et comportement des utilisateurs',
      icon: <BarChart3 className="w-5 h-5" />,
      connected: true,
      status: 'active',
      lastSync: '2024-01-20T10:30:00Z',
      metrics: [
        { label: 'Sessions (7j)', value: '2,847' },
        { label: 'Taux de rebond', value: '68.2%' },
        { label: 'Durée moyenne', value: '2m 34s' }
      ]
    },
    {
      id: 'google-search-console',
      name: 'Google Search Console',
      description: 'Performance SEO et indexation',
      icon: <Search className="w-5 h-5" />,
      connected: true,
      status: 'active',
      lastSync: '2024-01-20T09:15:00Z',
      metrics: [
        { label: 'Impressions (28j)', value: '45,231' },
        { label: 'Clics', value: '1,847' },
        { label: 'Position moyenne', value: '24.8' }
      ]
    },
    {
      id: 'semrush',
      name: 'SEMrush',
      description: 'Analyse concurrentielle et mots-clés',
      icon: <TrendingUp className="w-5 h-5" />,
      connected: false,
      status: 'pending',
      metrics: [
        { label: 'Mots-clés suivis', value: '156' },
        { label: 'Backlinks', value: '1,247' },
        { label: 'Score autorité', value: '42' }
      ]
    },
    {
      id: 'hotjar',
      name: 'Hotjar',
      description: 'Heatmaps et enregistrements d\'écran',
      icon: <Zap className="w-5 h-5" />,
      connected: false,
      status: 'pending'
    }
  ]);

  const [showSetupForm, setShowSetupForm] = useState<string | null>(null);

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Actif</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Erreur</Badge>;
      case 'pending':
        return <Badge variant="secondary">Non connecté</Badge>;
      default:
        return null;
    }
  };

  const handleConnect = (integrationId: string) => {
    setShowSetupForm(integrationId);
  };

  const renderSetupForm = (integration: Integration) => {
    switch (integration.id) {
      case 'google-analytics':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="ga-tracking-id">ID de mesure Google Analytics</Label>
              <Input id="ga-tracking-id" placeholder="G-XXXXXXXXXX" />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="ga-ecommerce" />
              <Label htmlFor="ga-ecommerce">Activer le suivi e-commerce</Label>
            </div>
          </div>
        );
      case 'google-search-console':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="gsc-domain">Domaine du site</Label>
              <Input id="gsc-domain" placeholder="https://example.com" />
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Vous devez vérifier la propriété de votre site dans Google Search Console avant de pouvoir connecter cette intégration.
              </p>
              <Button variant="link" className="p-0 h-auto text-blue-600">
                <ExternalLink className="w-4 h-4 mr-1" />
                Ouvrir Search Console
              </Button>
            </div>
          </div>
        );
      case 'semrush':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="semrush-api-key">Clé API SEMrush</Label>
              <Input id="semrush-api-key" type="password" placeholder="Votre clé API SEMrush" />
            </div>
            <div>
              <Label htmlFor="semrush-domain">Domaine à analyser</Label>
              <Input id="semrush-domain" placeholder="example.com" />
            </div>
          </div>
        );
      case 'hotjar':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="hotjar-site-id">Site ID Hotjar</Label>
              <Input id="hotjar-site-id" placeholder="1234567" />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="hotjar-recordings" />
              <Label htmlFor="hotjar-recordings">Activer les enregistrements</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="hotjar-heatmaps" />
              <Label htmlFor="hotjar-heatmaps">Activer les heatmaps</Label>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Intégrations Analytics</h2>
        <p className="text-muted-foreground">Connectez vos outils d'analyse pour des insights approfondis</p>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="integrations">Intégrations</TabsTrigger>
          <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
          <TabsTrigger value="reports">Rapports</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          <div className="grid gap-6">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {integration.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(integration.status)}
                      {integration.connected ? (
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-1" />
                          Configurer
                        </Button>
                      ) : (
                        <Button onClick={() => handleConnect(integration.id)} size="sm">
                          Connecter
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {integration.connected && integration.metrics && (
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {integration.metrics.map((metric, index) => (
                        <div key={index} className="text-center">
                          <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                          <p className="text-sm text-muted-foreground">{metric.label}</p>
                        </div>
                      ))}
                    </div>
                    {integration.lastSync && (
                      <p className="text-xs text-muted-foreground mt-4">
                        Dernière synchronisation : {new Date(integration.lastSync).toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                )}

                {showSetupForm === integration.id && (
                  <CardContent className="border-t">
                    <div className="space-y-4">
                      <h4 className="font-medium">Configuration {integration.name}</h4>
                      {renderSetupForm(integration)}
                      <div className="flex space-x-2 pt-4">
                        <Button>Connecter</Button>
                        <Button variant="outline" onClick={() => setShowSetupForm(null)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vue d'ensemble du trafic</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sessions totales</span>
                    <span className="font-bold">12,847</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nouveaux visiteurs</span>
                    <span className="font-bold">68.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pages par session</span>
                    <span className="font-bold">2.8</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance SEO</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mots-clés classés</span>
                    <span className="font-bold">1,247</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Top 10 positions</span>
                    <span className="font-bold">89</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trafic organique</span>
                    <span className="font-bold">78.4%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conversions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taux de conversion</span>
                    <span className="font-bold">3.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Objectifs atteints</span>
                    <span className="font-bold">456</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valeur moyenne</span>
                    <span className="font-bold">€89.50</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Rapports personnalisés</h3>
            <p className="text-muted-foreground mb-4">
              Créez des rapports automatisés combinant toutes vos sources de données
            </p>
            <Button>
              Créer un rapport
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}