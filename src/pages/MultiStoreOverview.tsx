import React from 'react';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import StatCard from '../components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Store, TrendingUp, AlertTriangle, CheckCircle, ExternalLink, Plus, BarChart3 } from 'lucide-react';

interface Shop {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'warning' | 'error';
  seoScore: number;
  traffic: number;
  conversions: number;
  lastOptimization: string;
  issues: number;
  keywords: number;
}

export default function MultiStoreOverview() {
  // Mock data for demonstration
  const shops: Shop[] = [
    {
      id: '1',
      name: 'Boutique Mode Premium',
      domain: 'mode-premium.com',
      status: 'active',
      seoScore: 87,
      traffic: 12450,
      conversions: 234,
      lastOptimization: '2024-01-20',
      issues: 2,
      keywords: 156
    },
    {
      id: '2',
      name: 'Tech Store Pro',
      domain: 'techstore-pro.fr',
      status: 'warning',
      seoScore: 73,
      traffic: 8920,
      conversions: 145,
      lastOptimization: '2024-01-18',
      issues: 8,
      keywords: 203
    },
    {
      id: '3',
      name: 'Jardin & Maison',
      domain: 'jardin-maison.net',
      status: 'error',
      seoScore: 45,
      traffic: 3240,
      conversions: 67,
      lastOptimization: '2024-01-10',
      issues: 15,
      keywords: 89
    },
    {
      id: '4',
      name: 'Beauty Corner',
      domain: 'beauty-corner.com',
      status: 'active',
      seoScore: 91,
      traffic: 15670,
      conversions: 398,
      lastOptimization: '2024-01-19',
      issues: 1,
      keywords: 267
    }
  ];

  const totalTraffic = shops.reduce((sum, shop) => sum + shop.traffic, 0);
  const totalConversions = shops.reduce((sum, shop) => sum + shop.conversions, 0);
  const averageSeoScore = Math.round(shops.reduce((sum, shop) => sum + shop.seoScore, 0) / shops.length);
  const totalIssues = shops.reduce((sum, shop) => sum + shop.issues, 0);

  const getStatusColor = (status: Shop['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
    }
  };

  const getStatusIcon = (status: Shop['status']) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getSeoScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Multi-Store Overview</h1>
                <p className="text-muted-foreground">Gérez toutes vos boutiques depuis un tableau de bord unifié</p>
              </div>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une boutique
              </Button>
            </div>

            {/* Global Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Trafic Total"
                value={totalTraffic.toLocaleString()}
                icon={BarChart3}
                trend={{ value: 12.5 }}
              />
              <StatCard
                title="Conversions"
                value={totalConversions.toString()}
                icon={TrendingUp}
                trend={{ value: 8.3 }}
              />
              <StatCard
                title="Score SEO Moyen"
                value={`${averageSeoScore}/100`}
                icon={CheckCircle}
              />
              <StatCard
                title="Problèmes Détectés"
                value={totalIssues.toString()}
                icon={AlertTriangle}
              />
            </div>

            {/* Shops Grid */}
            <div className="grid gap-6">
              {shops.map((shop) => (
                <Card key={shop.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Store className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{shop.name}</CardTitle>
                          <p className="text-muted-foreground flex items-center">
                            {shop.domain}
                            <ExternalLink className="w-4 h-4 ml-1" />
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(shop.status)}>
                          {getStatusIcon(shop.status)}
                          <span className="ml-1 capitalize">{shop.status}</span>
                        </Badge>
                        <Button variant="outline" size="sm">
                          Gérer
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Score SEO</span>
                          <span className={`font-bold ${getSeoScoreColor(shop.seoScore)}`}>
                            {shop.seoScore}/100
                          </span>
                        </div>
                        <Progress value={shop.seoScore} className="h-2" />
                      </div>
                      
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{shop.traffic.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Sessions</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{shop.conversions}</p>
                        <p className="text-sm text-muted-foreground">Conversions</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-2xl font-bold text-foreground">{shop.keywords}</p>
                        <p className="text-sm text-muted-foreground">Mots-clés</p>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-muted-foreground">
                          Dernière optimisation : {new Date(shop.lastOptimization).toLocaleDateString()}
                        </span>
                        {shop.issues > 0 && (
                          <Badge variant="outline" className="text-orange-600">
                            {shop.issues} problème{shop.issues > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          Analytics
                        </Button>
                        <Button variant="outline" size="sm">
                          SEO+
                        </Button>
                        <Button size="sm">
                          Optimiser
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-20 flex-col">
                    <BarChart3 className="w-6 h-6 mb-2" />
                    Rapport Global
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <TrendingUp className="w-6 h-6 mb-2" />
                    Optimisation Groupée
                  </Button>
                  <Button variant="outline" className="h-20 flex-col">
                    <AlertTriangle className="w-6 h-6 mb-2" />
                    Résoudre Problèmes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}