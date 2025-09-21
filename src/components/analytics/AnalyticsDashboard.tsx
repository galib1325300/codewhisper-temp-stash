import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '../ui/use-toast';

interface AnalyticsDashboardProps {
  shopId?: string;
  className?: string;
}

interface AnalyticsData {
  organicTraffic: number;
  conversions: number;
  ctr: number;
  revenue: number;
  previousData?: {
    organicTraffic: number;
    conversions: number;
    ctr: number;
    revenue: number;
  };
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  shopId, 
  className = '' 
}) => {
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [shopType, setShopType] = useState<string>('');
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      // Get shop details first
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .single();

      if (shopError || !shopData) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les données de la boutique",
          variant: "destructive"
        });
        return;
      }

      setShopType(shopData.type);

      // Check if analytics are enabled
      if (!shopData.analytics_enabled) {
        setAnalyticsData(null);
        return;
      }

      let functionName = '';
      let hasRequiredTokens = false;

      if (shopData.type === 'shopify') {
        functionName = 'get-shopify-analytics';
        hasRequiredTokens = !!shopData.shopify_access_token;
      } else if (shopData.type === 'wordpress' || shopData.type === 'woocommerce') {
        // Try Jetpack first, fall back to basic WordPress API
        if (shopData.jetpack_access_token) {
          functionName = 'get-wordpress-analytics';
          hasRequiredTokens = true;
        } else if (shopData.consumer_key && shopData.consumer_secret) {
          functionName = 'get-wordpress-basic-analytics';
          hasRequiredTokens = true;
        } else {
          hasRequiredTokens = false;
        }
      }

      if (!hasRequiredTokens) {
        toast({
          title: "Configuration requise",
          description: "Veuillez configurer vos tokens d'accès ou credentials WooCommerce dans les paramètres",
          variant: "destructive"
        });
        return;
      }

      console.log(`Calling ${functionName} for shop ${shopId}`);

      const { data: analyticsData, error } = await supabase.functions.invoke(functionName, {
        body: { 
          shopId,
          timeRange: `${timeRange}days`
        }
      });

      if (error) {
        console.error('Analytics error:', error);
        toast({
          title: "Erreur Analytics",
          description: `Impossible de récupérer les données: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      // Map the new analytics data structure
      const current = analyticsData.current || {};
      const previous = analyticsData.previous || {};
      
      setAnalyticsData({
        organicTraffic: current.organic_traffic || 0,
        conversions: current.conversions || 0,
        ctr: current.ctr || 0,
        revenue: current.revenue || 0,
        previousData: {
          organicTraffic: previous.organic_traffic || 0,
          conversions: previous.conversions || 0,
          ctr: previous.ctr || 0,
          revenue: previous.revenue || 0
        }
      });
      
      const source = analyticsData?.metadata?.source || functionName;
      const isBasicAPI = source.includes('basic') || source.includes('wp-statistics');
      
      toast({
        title: "Données mises à jour",
        description: `Analytics récupérées ${isBasicAPI ? '(API WordPress de base)' : '(Jetpack)'}`,
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du chargement des analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and when dependencies change
  useEffect(() => {
    fetchAnalyticsData();
  }, [shopId, timeRange]);

  // Prepare metrics data
  const metrics = analyticsData ? [
    {
      id: 'traffic',
      title: 'Trafic Organique',
      value: analyticsData.organicTraffic,
      previousValue: analyticsData.previousData?.organicTraffic,
      icon: TrendingUp,
      format: 'number' as const,
      variant: 'gradient' as const,
      loading
    },
    {
      id: 'conversions',
      title: 'Conversions',
      value: analyticsData.conversions,
      previousValue: analyticsData.previousData?.conversions,
      icon: ShoppingBag,
      format: 'number' as const,
      variant: 'gradient' as const,
      loading
    },
    {
      id: 'ctr',
      title: 'Taux de Clic',
      value: analyticsData.ctr,
      previousValue: analyticsData.previousData?.ctr,
      icon: MousePointer,
      format: 'percentage' as const,
      variant: 'gradient' as const,
      loading
    },
    {
      id: 'revenue',
      title: 'Revenus SEO',
      value: analyticsData.revenue,
      previousValue: analyticsData.previousData?.revenue,
      icon: Users,
      format: 'currency' as const,
      variant: 'gradient' as const,
      loading
    }
  ] : [];

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
    await fetchAnalyticsData();
    setRefreshing(false);
  };

  const handleExport = () => {
    // Logique d'export des données
    console.log('Exporting analytics data...');
  };

  // Check if analytics are not configured
  const needsConfiguration = !analyticsData && !loading;
  const tokenType = shopType === 'shopify' ? 'Shopify' : 'WordPress/Jetpack';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Configuration Warning */}
      {needsConfiguration && (
        <Card className="border-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.05)]">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-[hsl(var(--warning)/0.2)] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[hsl(var(--warning))]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Analytics non configuré
                </h3>
                <p className="text-muted-foreground mb-4">
                  {shopType === 'shopify' 
                    ? 'Configurez votre token Shopify pour accéder aux analytics.'
                    : 'Configurez vos credentials WooCommerce ou votre token Jetpack pour accéder aux analytics.'
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={() => navigate(`/admin/shops/${shopId}/settings`)}
                    className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] hover:bg-[hsl(var(--warning)/0.9)]"
                  >
                    Configurer {tokenType}
                  </Button>
                  <Button variant="secondary" size="sm">
                    <Search className="w-4 h-4 mr-2" />
                    Guide de configuration
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header avec contrôles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics SEO</h2>
          <p className="text-muted-foreground">
            {needsConfiguration 
              ? "Configurez votre connexion pour voir vos données réelles"
              : "Suivez les performances de votre référencement naturel"
            }
          </p>
        </div>
        
        {!needsConfiguration && (
          <div className="flex items-center space-x-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 derniers jours</SelectItem>
                <SelectItem value="30">30 derniers jours</SelectItem>
                <SelectItem value="90">90 derniers jours</SelectItem>
                <SelectItem value="365">1 an</SelectItem>
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
        )}
      </div>

      {!needsConfiguration && (
        <>
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
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;