import React, { useState } from 'react';
import { Settings, Target, TrendingUp, Sparkles, Download, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNicheSuggestions, useCompetitorAnalysis, useGenerateSite, useGeneratedSite } from '@/hooks/useAIGenerator';
import NicheSuggestionCard from './NicheSuggestionCard';
import GenerationProgress from './GenerationProgress';
import ExportOptions from './ExportOptions';
import LoadingState from '@/components/ui/loading-state';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

const steps = [
  { id: 1, name: 'Configuration', icon: Settings },
  { id: 2, name: 'Choix niche', icon: Target },
  { id: 3, name: 'Concurrents', icon: TrendingUp },
  { id: 4, name: 'Génération', icon: Sparkles },
  { id: 5, name: 'Export', icon: Download }
];

export default function GeneratorWizard() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState({
    country: 'FR',
    language: 'fr',
    productCount: 100
  });
  const [selectedNiche, setSelectedNiche] = useState<any>(null);
  const [manualUrls, setManualUrls] = useState<string>('');
  const [competitorData, setCompetitorData] = useState<any>(null);
  const [generatedSiteId, setGeneratedSiteId] = useState<string | undefined>();

  const { data: niches, isLoading: nichesLoading } = useNicheSuggestions(config);
  const competitorMutation = useCompetitorAnalysis();
  const generateMutation = useGenerateSite();
  const { data: siteStatus } = useGeneratedSite(generatedSiteId);

  const handleAnalyzeCompetitors = async () => {
    try {
      // Parse manual URLs if provided
      const urlList = manualUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')));

      const result = await competitorMutation.mutateAsync({
        nicheName: selectedNiche.name,
        country: config.country,
        language: config.language,
        manualUrls: urlList.length > 0 ? urlList : undefined,
      });
      setCompetitorData(result);
      toast({ 
        title: 'Analyse terminée', 
        description: urlList.length > 0 
          ? `${urlList.length} concurrents analysés avec succès` 
          : 'Concurrents simulés analysés avec succès'
      });
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  const handleGenerateSite = async () => {
    try {
      const site = await generateMutation.mutateAsync({
        nicheName: selectedNiche.name,
        targetProductCount: config.productCount,
        language: config.language,
        country: config.country,
        competitors: competitorData.competitors.map((c: any) => c.url),
        recommendedStructure: competitorData.recommended_structure,
      });
      setGeneratedSiteId(site.id);
      setCurrentStep(4);
      toast({ title: 'Génération lancée', description: 'La création du site a démarré' });
    } catch (error: any) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Configuration du site</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="country">Pays cible</Label>
          <Select value={config.country} onValueChange={(v) => setConfig({ ...config, country: v })}>
            <SelectTrigger id="country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FR">France</SelectItem>
              <SelectItem value="US">États-Unis</SelectItem>
              <SelectItem value="GB">Royaume-Uni</SelectItem>
              <SelectItem value="DE">Allemagne</SelectItem>
              <SelectItem value="ES">Espagne</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="language">Langue</Label>
          <Select value={config.language} onValueChange={(v) => setConfig({ ...config, language: v })}>
            <SelectTrigger id="language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="en">Anglais</SelectItem>
              <SelectItem value="de">Allemand</SelectItem>
              <SelectItem value="es">Espagnol</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="productCount">Nombre de produits souhaités</Label>
        <Input
          id="productCount"
          type="number"
          value={config.productCount}
          onChange={(e) => setConfig({ ...config, productCount: parseInt(e.target.value) })}
          min={10}
          max={500}
        />
        <p className="text-sm text-muted-foreground mt-1">Entre 10 et 500 produits</p>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Sélectionnez une niche</h2>
      
      {nichesLoading ? (
        <LoadingState text="Recherche de niches rentables..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {niches?.map(niche => (
            <NicheSuggestionCard
              key={niche.name}
              niche={niche}
              selected={selectedNiche?.name === niche.name}
              onSelect={() => setSelectedNiche(niche)}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analyse des concurrents</h2>
      
      {!competitorData ? (
        <div className="space-y-6">
          <Alert>
            <LinkIcon className="h-4 w-4" />
            <AlertDescription>
              <strong>Recommandé :</strong> Recherchez sur SEMrush ou Google "<em>{selectedNiche?.name} shop</em>" 
              et collez les URLs des 5-10 meilleurs sites dropshipping concurrents ci-dessous.
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="manualUrls">URLs des concurrents (optionnel)</Label>
            <Textarea
              id="manualUrls"
              placeholder="https://concurrent1.com&#10;https://concurrent2.com&#10;https://concurrent3.com&#10;...&#10;&#10;Ou collez les résultats SEMrush"
              value={manualUrls}
              onChange={(e) => setManualUrls(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Collez une URL par ligne. Si vous laissez vide, nous utiliserons des données simulées.
            </p>
          </div>

          <div className="text-center">
            <Button 
              onClick={handleAnalyzeCompetitors}
              disabled={competitorMutation.isPending}
              size="lg"
            >
              {competitorMutation.isPending ? 'Analyse en cours...' : 'Analyser les concurrents'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">Top {competitorData.competitors.length} concurrents détectés</h3>
            <ul className="space-y-2">
              {competitorData.competitors.map((c: any) => (
                <li key={c.url} className="flex items-center justify-between">
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {c.url}
                  </a>
                  <span className="text-sm text-muted-foreground">{c.productCount} produits</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Catégories recommandées</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {competitorData.recommended_structure.categories.map((cat: string) => (
                  <li key={cat}>{cat}</li>
                ))}
              </ul>
            </div>

            <div className="bg-card border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Mots-clés prioritaires</h4>
              <div className="flex flex-wrap gap-2">
                {competitorData.recommended_structure.top_keywords.slice(0, 6).map((kw: string) => (
                  <span key={kw} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Génération en cours</h2>
      
      {!generatedSiteId ? (
        <div className="text-center py-12">
          <Button 
            onClick={handleGenerateSite}
            disabled={generateMutation.isPending}
            size="lg"
          >
            {generateMutation.isPending ? 'Lancement...' : 'Démarrer la génération'}
          </Button>
        </div>
      ) : (
        <GenerationProgress
          status={siteStatus?.status}
          productsGenerated={siteStatus?.products_count || 0}
          totalProducts={config.productCount}
          collectionsGenerated={siteStatus?.collections_count || 0}
        />
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Export du catalogue</h2>
      <ExportOptions
        siteId={generatedSiteId}
        wooUrl={siteStatus?.csv_woocommerce_url}
        shopifyUrl={siteStatus?.csv_shopify_url}
      />
    </div>
  );

  const canGoNext = () => {
    if (currentStep === 1) return true;
    if (currentStep === 2) return !!selectedNiche;
    if (currentStep === 3) return !!competitorData;
    if (currentStep === 4) return siteStatus?.status === 'completed';
    return true;
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center justify-between mb-12">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div 
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                    isActive ? 'bg-primary text-primary-foreground' :
                    isCompleted ? 'bg-primary/20 text-primary' :
                    'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`text-sm ${isActive ? 'font-semibold' : ''}`}>
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-card border rounded-lg p-8 mb-6">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(s => s - 1)}
          disabled={currentStep === 1}
        >
          Précédent
        </Button>
        <Button
          onClick={() => setCurrentStep(s => s + 1)}
          disabled={currentStep === 5 || !canGoNext()}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}
