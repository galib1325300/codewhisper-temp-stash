import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LoadingState from '../ui/loading-state';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger_type: 'schedule' | 'event' | 'threshold';
  trigger_value: string;
  actions: string[];
  status: 'active' | 'paused' | 'error';
  last_run: string | null;
  successful_runs: number;
  total_runs: number;
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
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    triggerType: 'schedule',
    triggerValue: '',
    actions: ''
  });

  useEffect(() => {
    if (shopId) {
      loadRules();
    }
  }, [shopId]);

  const loadRules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedRules: AutomationRule[] = (data || []).map(rule => ({
        id: rule.id,
        name: rule.name,
        description: rule.description || '',
        trigger_type: rule.trigger_type as 'schedule' | 'event' | 'threshold',
        trigger_value: rule.trigger_value,
        actions: Array.isArray(rule.actions) ? rule.actions.map(a => String(a)) : [],
        status: rule.status as 'active' | 'paused' | 'error',
        last_run: rule.last_run,
        successful_runs: rule.successful_runs || 0,
        total_runs: rule.total_runs || 0,
        frequency: getFrequencyLabel(rule.trigger_type, rule.trigger_value)
      }));

      setRules(mappedRules);
    } catch (error) {
      console.error('Error loading automation rules:', error);
      toast.error('Erreur lors du chargement des automatisations');
    } finally {
      setLoading(false);
    }
  };

  const getFrequencyLabel = (triggerType: string, triggerValue: string): string => {
    if (triggerType === 'schedule') {
      if (triggerValue === 'daily') return 'Quotidien';
      if (triggerValue === 'weekly') return 'Hebdomadaire';
      if (triggerValue === 'monthly') return 'Mensuel';
      return 'Planifié';
    }
    if (triggerType === 'event') return 'Sur événement';
    return 'Conditionnel';
  };

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

  const toggleRuleStatus = async (ruleId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      
      const { error } = await supabase
        .from('automation_rules')
        .update({ status: newStatus })
        .eq('id', ruleId);

      if (error) throw error;

      setRules(prev => prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, status: newStatus as 'active' | 'paused' }
          : rule
      ));

      toast.success(`Règle ${newStatus === 'active' ? 'activée' : 'désactivée'}`);
    } catch (error) {
      console.error('Error toggling rule status:', error);
      toast.error('Erreur lors de la modification du statut');
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      setRules(prev => prev.filter(rule => rule.id !== ruleId));
      toast.success('Règle supprimée');
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const createOrUpdateRule = async () => {
    if (!shopId || !newRule.name.trim()) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    try {
      const actionsArray = newRule.actions.split(',').map(a => a.trim()).filter(a => a);

      if (editingRule) {
        // Update existing rule
        const { error } = await supabase
          .from('automation_rules')
          .update({
            name: newRule.name,
            description: newRule.description,
            trigger_type: newRule.triggerType,
            trigger_value: newRule.triggerValue,
            actions: actionsArray
          })
          .eq('id', editingRule.id);

        if (error) throw error;
        toast.success('Règle mise à jour');
      } else {
        // Create new rule
        const { error } = await supabase
          .from('automation_rules')
          .insert({
            shop_id: shopId,
            name: newRule.name,
            description: newRule.description,
            trigger_type: newRule.triggerType,
            trigger_value: newRule.triggerValue,
            actions: actionsArray,
            status: 'active'
          });

        if (error) throw error;
        toast.success('Règle créée avec succès');
      }

      await loadRules();
      resetForm();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating/updating rule:', error);
      toast.error('Erreur lors de l\'enregistrement de la règle');
    }
  };

  const startEditRule = (rule: AutomationRule) => {
    setEditingRule(rule);
    setNewRule({
      name: rule.name,
      description: rule.description,
      triggerType: rule.trigger_type,
      triggerValue: rule.trigger_value,
      actions: rule.actions.join(', ')
    });
    setIsCreateDialogOpen(true);
  };

  const resetForm = () => {
    setNewRule({
      name: '',
      description: '',
      triggerType: 'schedule',
      triggerValue: '',
      actions: ''
    });
    setEditingRule(null);
  };

  const activeRules = rules.filter(r => r.status === 'active').length;
  const totalSuccess = rules.reduce((sum, r) => sum + r.successful_runs, 0);
  const totalRuns = rules.reduce((sum, r) => sum + r.total_runs, 0);
  const successRate = totalRuns > 0 ? (totalSuccess / totalRuns) * 100 : 0;

  if (loading) {
    return <LoadingState text="Chargement des automatisations..." />;
  }

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
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-primary to-primary-glow">
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle règle
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md" aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle>
                    {editingRule ? 'Modifier la règle' : 'Créer une règle d\'automatisation'}
                  </DialogTitle>
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
                    {newRule.triggerType === 'schedule' ? (
                      <Select value={newRule.triggerValue} onValueChange={(value) => setNewRule(prev => ({ ...prev, triggerValue: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir une fréquence" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Quotidien</SelectItem>
                          <SelectItem value="weekly">Hebdomadaire</SelectItem>
                          <SelectItem value="monthly">Mensuel</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="triggerValue"
                        value={newRule.triggerValue}
                        onChange={(e) => setNewRule(prev => ({ ...prev, triggerValue: e.target.value }))}
                        placeholder={
                          newRule.triggerType === 'event' 
                            ? "Ex: new_product, image_upload" 
                            : "Ex: position_drop_5, score_below_70"
                        }
                      />
                    )}
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

                  <Button onClick={createOrUpdateRule} className="w-full">
                    {editingRule ? 'Mettre à jour' : 'Créer la règle'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Rules List */}
      {rules.length === 0 ? (
        <Card className="card-elevated">
          <CardContent className="p-12 text-center">
            <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Aucune automatisation</h3>
            <p className="text-muted-foreground mb-4">
              Créez votre première règle d'automatisation pour optimiser votre SEO automatiquement.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer une règle
            </Button>
          </CardContent>
        </Card>
      ) : (
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
                      onCheckedChange={() => toggleRuleStatus(rule.id, rule.status)}
                    />
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => startEditRule(rule)}
                    >
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
                      <span>{rule.successful_runs}/{rule.total_runs} succès</span>
                    </div>
                    {rule.last_run && (
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 text-muted-foreground mr-1" />
                        <span>Dernière: {new Date(rule.last_run).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  
                  {rule.total_runs > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-24">
                        <Progress value={(rule.successful_runs / rule.total_runs) * 100} className="h-1" />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {Math.round((rule.successful_runs / rule.total_runs) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutomationRules;