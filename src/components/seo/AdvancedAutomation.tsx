import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Plus, Settings, Play, Pause, Zap, Clock, Target, Filter, ChevronRight } from 'lucide-react';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'draft';
  trigger: {
    type: 'schedule' | 'condition' | 'event';
    value: string;
  };
  conditions: {
    field: string;
    operator: string;
    value: string;
  }[];
  actions: {
    type: string;
    target: string;
    value: string;
  }[];
  lastRun?: string;
  nextRun?: string;
  executionCount: number;
}

interface AdvancedAutomationProps {
  shopId?: string;
  className?: string;
}

export default function AdvancedAutomation({ shopId, className }: AdvancedAutomationProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const [rules] = useState<AutomationRule[]>([
    {
      id: '1',
      name: 'Optimisation automatique des titres',
      description: 'Met à jour les titres des produits selon les performances SEO',
      status: 'active',
      trigger: { type: 'schedule', value: 'daily' },
      conditions: [
        { field: 'seo_score', operator: 'less_than', value: '70' },
        { field: 'traffic', operator: 'less_than', value: '100' }
      ],
      actions: [
        { type: 'update_title', target: 'product', value: 'optimize_keywords' },
        { type: 'send_notification', target: 'admin', value: 'title_updated' }
      ],
      lastRun: '2024-01-20T08:00:00Z',
      nextRun: '2024-01-21T08:00:00Z',
      executionCount: 45
    },
    {
      id: '2',
      name: 'Génération méta descriptions manquantes',
      description: 'Crée automatiquement les méta descriptions pour les produits qui n\'en ont pas',
      status: 'active',
      trigger: { type: 'event', value: 'product_created' },
      conditions: [
        { field: 'meta_description', operator: 'is_empty', value: '' }
      ],
      actions: [
        { type: 'generate_meta_description', target: 'product', value: 'ai_generated' }
      ],
      lastRun: '2024-01-19T14:30:00Z',
      executionCount: 12
    },
    {
      id: '3',
      name: 'Alerte concurrence',
      description: 'Surveille les nouveaux contenus des concurrents et suggère des améliorations',
      status: 'paused',
      trigger: { type: 'schedule', value: 'weekly' },
      conditions: [
        { field: 'competitor_ranking', operator: 'better_than', value: 'our_ranking' }
      ],
      actions: [
        { type: 'analyze_competitor', target: 'content', value: 'extract_keywords' },
        { type: 'create_task', target: 'team', value: 'content_improvement' }
      ],
      nextRun: '2024-01-27T10:00:00Z',
      executionCount: 8
    }
  ]);

  const templates = [
    {
      id: 'title_optimizer',
      name: 'Optimiseur de titres',
      description: 'Optimise automatiquement les titres selon les performances',
      category: 'seo'
    },
    {
      id: 'meta_generator',
      name: 'Générateur méta descriptions',
      description: 'Génère des méta descriptions pour les contenus manquants',
      category: 'content'
    },
    {
      id: 'keyword_monitor',
      name: 'Surveillant de mots-clés',
      description: 'Suit les positions et alerte en cas de chute',
      category: 'monitoring'
    },
    {
      id: 'competitor_alert',
      name: 'Alerte concurrentielle',
      description: 'Surveille les actions des concurrents',
      category: 'competitive'
    }
  ];

  const getStatusColor = (status: AutomationRule['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: AutomationRule['status']) => {
    switch (status) {
      case 'active': return <Play className="w-3 h-3" />;
      case 'paused': return <Pause className="w-3 h-3" />;
      default: return <Settings className="w-3 h-3" />;
    }
  };

  const renderConditionBuilder = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Conditions de déclenchement</Label>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Ajouter condition
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-2 p-3 border rounded-lg">
          <Select defaultValue="seo_score">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seo_score">Score SEO</SelectItem>
              <SelectItem value="traffic">Trafic</SelectItem>
              <SelectItem value="ranking">Classement</SelectItem>
              <SelectItem value="conversions">Conversions</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue="less_than">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="less_than">Inférieur à</SelectItem>
              <SelectItem value="greater_than">Supérieur à</SelectItem>
              <SelectItem value="equals">Égal à</SelectItem>
              <SelectItem value="contains">Contient</SelectItem>
            </SelectContent>
          </Select>
          
          <Input placeholder="Valeur" className="w-24" />
          <Button variant="ghost" size="sm">×</Button>
        </div>
      </div>
    </div>
  );

  const renderActionBuilder = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Actions à exécuter</Label>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Ajouter action
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-2 p-3 border rounded-lg">
          <Select defaultValue="update_title">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="update_title">Modifier titre</SelectItem>
              <SelectItem value="generate_meta">Générer méta</SelectItem>
              <SelectItem value="send_notification">Notification</SelectItem>
              <SelectItem value="create_task">Créer tâche</SelectItem>
            </SelectContent>
          </Select>
          
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          
          <Select defaultValue="product">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product">Produit</SelectItem>
              <SelectItem value="category">Catégorie</SelectItem>
              <SelectItem value="page">Page</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          
          <Input placeholder="Paramètres" className="flex-1" />
          <Button variant="ghost" size="sm">×</Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Automatisations Avancées</h2>
          <p className="text-muted-foreground">Créez des règles complexes pour automatiser vos tâches SEO</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle automatisation
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Créer une nouvelle automatisation</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="template" className="space-y-6">
              <TabsList>
                <TabsTrigger value="template">Modèles</TabsTrigger>
                <TabsTrigger value="custom">Personnalisé</TabsTrigger>
              </TabsList>

              <TabsContent value="template" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <Card 
                      key={template.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedTemplate === template.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
                {selectedTemplate && (
                  <div className="flex gap-2 pt-4">
                    <Button>Créer à partir du modèle</Button>
                    <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                      Annuler
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="custom" className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="rule-name">Nom de la règle</Label>
                    <Input id="rule-name" placeholder="Nom de votre automatisation" />
                  </div>
                  
                  <div>
                    <Label htmlFor="rule-description">Description</Label>
                    <Textarea id="rule-description" placeholder="Décrivez ce que fait cette automatisation" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="trigger-type">Type de déclencheur</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un déclencheur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="schedule">Planifié</SelectItem>
                          <SelectItem value="event">Événement</SelectItem>
                          <SelectItem value="condition">Condition</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="frequency">Fréquence</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Fréquence d'exécution" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Toutes les heures</SelectItem>
                          <SelectItem value="daily">Quotidien</SelectItem>
                          <SelectItem value="weekly">Hebdomadaire</SelectItem>
                          <SelectItem value="monthly">Mensuel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {renderConditionBuilder()}
                  {renderActionBuilder()}

                  <div className="flex items-center space-x-2">
                    <Switch id="auto-start" />
                    <Label htmlFor="auto-start">Démarrer automatiquement</Label>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button>Créer l'automatisation</Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Annuler
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getStatusColor(rule.status)}>
                    {getStatusIcon(rule.status)}
                    <span className="ml-1 capitalize">{rule.status}</span>
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-medium mb-2 flex items-center">
                    <Target className="w-4 h-4 mr-1" />
                    Déclencheur
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {rule.trigger.type === 'schedule' ? 'Planifié' : 
                     rule.trigger.type === 'event' ? 'Événement' : 'Condition'} - {rule.trigger.value}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 flex items-center">
                    <Filter className="w-4 h-4 mr-1" />
                    Conditions
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {rule.conditions.length} condition(s) configurée(s)
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Exécutions
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {rule.executionCount} fois exécutée
                  </p>
                  {rule.nextRun && (
                    <p className="text-xs text-muted-foreground">
                      Prochaine : {new Date(rule.nextRun).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-wrap gap-2">
                  {rule.actions.map((action, index) => (
                    <Badge key={index} variant="outline">
                      {action.type.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}