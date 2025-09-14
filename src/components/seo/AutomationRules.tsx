import React, { useState } from 'react';
import { 
  Zap, 
  Clock, 
  Settings,
  Play,
  Pause,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Timer,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'schedule' | 'event' | 'threshold';
    value: string;
  };
  actions: string[];
  status: 'active' | 'paused' | 'error';
  lastRun: string;
  success: number;
  total: number;
  frequency: string;
}

interface AutomationRulesProps {
  shopId?: string;
  className?: string;
}

const AutomationRules: React.FC<AutomationRulesProps> = ({
  shopId,
  className = ''
}) => {
  const [rules, setRules] = useState<AutomationRule[]>([
    {
      id: '1',
      name: 'Optimisation quotidienne des méta-données',
      description: 'Génère automatiquement des titres et descriptions SEO pour les nouveaux produits',
      trigger: {
        type: 'schedule',
        value: 'daily'
      },
      actions: ['Analyser nouveaux produits', 'Générer méta-descriptions', 'Optimiser titres'],
      status: 'active',
      lastRun: '2024-01-15T08:00:00Z',
      success: 142,
      total: 150,
      frequency: 'Quotidien'
    },
    {
      id: '2',
      name: 'Surveillance des positions de mots-clés',
      description: 'Surveille les positions et déclenche des optimisations si baisse détectée',
      trigger: {
        type: 'threshold',
        value: 'position_drop_5'
      },
      actions: ['Analyser baisse position', 'Optimiser contenu', 'Notifier équipe'],
      status: 'active',
      lastRun: '2024-01-15T14:30:00Z',
      success: 28,
      total: 32,
      frequency: 'En temps réel'
    },
    {
      id: '3',
      name: 'Analyse hebdomadaire de la concurrence',
      description: 'Analyse les stratégies SEO des concurrents et suggère des améliorations',
      trigger: {
        type: 'schedule',
        value: 'weekly'
      },
      actions: ['Scanner concurrents', 'Analyser mots-clés', 'Générer rapport'],
      status: 'paused',
      lastRun: '2024-01-08T10:00:00Z',
      success: 8,
      total: 10,
      frequency: 'Hebdomadaire'
    },
    {
      id: '4',
      name: 'Optimisation automatique des images',
      description: 'Compresse et optimise automatiquement les nouvelles images uploadées',
      trigger: {
        type: 'event',
        value: 'image_upload'
      },
      actions: ['Compresser image', 'Générer alt text', 'Convertir WebP'],
      status: 'active',
      lastRun: '2024-01-15T16:45:00Z',
      success: 87,
      total: 89,
      frequency: 'Sur événement'
    }
  ]);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    triggerType: 'schedule',
    triggerValue: '',
    actions: ''
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'paused': return 'bg-warning text-warning-foreground';
      case 'error': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-3 h-3" />;
      case 'paused': return <Pause className="w-3 h-3" />;
      case 'error': return <AlertTriangle className="w-3 h-3" />;
      default: return null;
    }
  };

  const toggleRuleStatus = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId 
        ? { 
            ...rule, 
            status: rule.status === 'active' ? 'paused' : 'active' 
          }
        : rule
    ));
  };

  const deleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
  };

  const createRule = () => {
    const rule: AutomationRule = {
      id: Date.now().toString(),
      name: newRule.name,
      description: newRule.description,
      trigger: {
        type: newRule.triggerType as any,
        value: newRule.triggerValue
      },
      actions: newRule.actions.split(',').map(a => a.trim()),
      status: 'active',
      lastRun: new Date().toISOString(),
      success: 0,
      total: 0,
      frequency: newRule.triggerType === 'schedule' 
        ? newRule.triggerValue === 'daily' ? 'Quotidien' : 'Hebdomadaire'
        : newRule.triggerType === 'event' ? 'Sur événement' : 'Conditionnel'
    };

    setRules(prev => [rule, ...prev]);
    setNewRule({
      name: '',
      description: '',
      triggerType: 'schedule',
      triggerValue: '',
      actions: ''
    });
    setIsCreateDialogOpen(false);
  };

  const activeRules = rules.filter(r => r.status === 'active').length;
  const totalSuccess = rules.reduce((sum, r) => sum + r.success, 0);
  const totalRuns = rules.reduce((sum, r) => sum + r.total, 0);
  const successRate = totalRuns > 0 ? (totalSuccess / totalRuns) * 100 : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Règles actives</p>
                <p className="text-lg font-semibold text-success">{activeRules}</p>
              </div>
              <Zap className="w-4 h-4 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taux de succès</p>
                <p className="text-lg font-semibold text-primary">{successRate.toFixed(1)}%</p>
              </div>
              <Target className="w-4 h-4 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Exécutions totales</p>
                <p className="text-lg font-semibold">{totalRuns}</p>
              </div>
              <Timer className="w-4 h-4 text-info" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Automatisations</p>
                <p className="text-lg font-semibold">{rules.length}</p>
              </div>
              <Settings className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2 text-primary" />
              Règles d'Automatisation SEO
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-primary to-primary-glow">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle règle
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Créer une règle d'automatisation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="ruleName">Nom de la règle</Label>
                    <Input
                      id="ruleName"
                      value={newRule.name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Optimisation quotidienne"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="ruleDescription">Description</Label>
                    <Textarea
                      id="ruleDescription"
                      value={newRule.description}
                      onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Décrivez ce que fait cette règle..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="triggerType">Type de déclencheur</Label>
                    <Select value={newRule.triggerType} onValueChange={(value) => setNewRule(prev => ({ ...prev, triggerType: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="schedule">Planifié</SelectItem>
                        <SelectItem value="event">Sur événement</SelectItem>
                        <SelectItem value="threshold">Seuil atteint</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="triggerValue">Valeur du déclencheur</Label>
                    <Input
                      id="triggerValue"
                      value={newRule.triggerValue}
                      onChange={(e) => setNewRule(prev => ({ ...prev, triggerValue: e.target.value }))}
                      placeholder="Ex: daily, new_product, position_drop_3"
                    />
                  </div>

                  <div>
                    <Label htmlFor="actions">Actions (séparées par des virgules)</Label>
                    <Textarea
                      id="actions"
                      value={newRule.actions}
                      onChange={(e) => setNewRule(prev => ({ ...prev, actions: e.target.value }))}
                      placeholder="Ex: Optimiser méta, Générer contenu, Envoyer notification"
                      rows={2}
                    />
                  </div>

                  <Button onClick={createRule} className="w-full">
                    Créer la règle
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map((rule) => (
          <Card key={rule.id} className="card-elevated">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-semibold text-foreground">{rule.name}</h3>
                    <Badge className={getStatusColor(rule.status)}>
                      {getStatusIcon(rule.status)}
                      <span className="ml-1 capitalize">{rule.status}</span>
                    </Badge>
                    <Badge variant="outline">{rule.frequency}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {rule.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {rule.actions.map((action, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={rule.status === 'active'}
                    onCheckedChange={() => toggleRuleStatus(rule.id)}
                  />
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deleteRule(rule.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-3 h-3 text-success mr-1" />
                    <span>{rule.success}/{rule.total} succès</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 text-muted-foreground mr-1" />
                    <span>Dernière: {new Date(rule.lastRun).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="w-24">
                    <Progress value={(rule.success / rule.total) * 100} className="h-1" />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {rule.total > 0 ? Math.round((rule.success / rule.total) * 100) : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AutomationRules;