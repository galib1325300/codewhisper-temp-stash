import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Eye, 
  Search, 
  MousePointer,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import MetricsGrid from './MetricsGrid';
import AnalyticsChart from './AnalyticsChart';
import Button from '../Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface AnalyticsDashboardProps {
  shopId?: string;
  className?: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  shopId, 
  className = '' 
}) => {
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Données exactes des analytics SEO
  const metrics = [
    {
      id: 'traffic',
      title: 'Trafic Organique',
      value: 12547,
      previousValue: 10232, // Pour obtenir +22.65%
      icon: TrendingUp,
      format: 'number' as const,
      variant: 'gradient' as const
    },
    {
      id: 'conversions',
      title: 'Conversions',
      value: 328,
      previousValue: 245, // Pour obtenir +33.88%
      icon: ShoppingBag,
      format: 'number' as const,
      variant: 'gradient' as const
    },
    {
      id: 'ctr',
      title: 'Taux de Clic',
      value: 3.24,
      previousValue: 2.87, // Pour obtenir +12.89%
      icon: MousePointer,
      format: 'percentage' as const,
      variant: 'gradient' as const
    },
    {
      id: 'revenue',
      title: 'Revenus SEO',
      value: 15680,
      previousValue: 12451, // Pour obtenir +25.94%
      icon: Users,
      format: 'currency' as const,
      variant: 'gradient' as const
    }
  ];

  const trafficData = [
    { name: 'Jan', value: 8500 },
    { name: 'Fév', value: 9200 },
    { name: 'Mar', value: 10100 },
    { name: 'Avr', value: 11300 },
    { name: 'Mai', value: 10800 },
    { name: 'Jun', value: 12547 }
  ];

  const keywordsData = [
    { name: 'Mot-clé 1', value: 1250 },
    { name: 'Mot-clé 2', value: 980 },
    { name: 'Mot-clé 3', value: 850 },
    { name: 'Mot-clé 4', value: 720 },
    { name: 'Mot-clé 5', value: 650 }
  ];

  const deviceData = [
    { name: 'Desktop', value: 45 },
    { name: 'Mobile', value: 40 },
    { name: 'Tablet', value: 15 }
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simuler un appel API
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  const handleExport = () => {
    // Logique d'export des données
    console.log('Exporting analytics data...');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header avec contrôles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics SEO</h2>
          <p className="text-muted-foreground">
            Suivez les performances de votre référencement naturel
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="90d">90 derniers jours</SelectItem>
              <SelectItem value="1y">1 an</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      <MetricsGrid 
        metrics={metrics} 
        columns={4}
        className="mb-8"
      />

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          data={trafficData}
          type="area"
          title="Évolution du Trafic Organique"
          height={350}
          color="hsl(var(--primary))"
          gradientColors={['hsl(var(--primary))', 'hsl(var(--primary) / 0.1)']}
        />
        
        <AnalyticsChart
          data={keywordsData}
          type="bar"
          title="Top Mots-clés"
          height={350}
          color="hsl(var(--info))"
          xAxisKey="name"
          dataKey="value"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnalyticsChart
            data={trafficData}
            type="line"
            title="Performance Mensuelle"
            height={300}
            color="hsl(var(--success))"
          />
        </div>
        
        <AnalyticsChart
          data={deviceData}
          type="pie"
          title="Trafic par Appareil"
          height={300}
        />
      </div>

      {/* Insights et recommandations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-success" />
              Tendances Positives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-success rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Trafic organique en hausse de 22%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Excellente progression ce mois-ci
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-success rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    15 nouveaux mots-clés en top 10
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Amélioration du positionnement
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-success rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Taux de conversion +34%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Optimisations payantes
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="w-5 h-5 mr-2 text-info" />
              Recommandations IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-info rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Optimiser les pages mobiles
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Impact estimé: +15% de trafic mobile
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-warning rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Créer du contenu pour "produits bio"
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Opportunité: 2,400 recherches/mois
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Améliorer les méta-descriptions
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CTR potentiel: +0.8%
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;