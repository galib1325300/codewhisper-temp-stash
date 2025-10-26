import React, { useState } from 'react';
import { Sparkles, Zap, CreditCard, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import GeneratorWizard from '@/components/ai-generator/GeneratorWizard';
import { useGeneratorSubscription } from '@/hooks/useAIGenerator';
import LoadingState from '@/components/ui/loading-state';
import { Link } from 'react-router-dom';

export default function AISiteGeneratorPage() {
  const { data: subscription, isLoading } = useGeneratorSubscription();
  const [skipSubscription, setSkipSubscription] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingState text="Chargement..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Back button */}
      <Link to="/admin" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Retour au dashboard</span>
      </Link>

      {/* Header avec gradient */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold">Générateur de Sites IA</h1>
            </div>
            <p className="text-white/90 text-lg mb-6 max-w-2xl">
              L'IA analyse votre niche, scrape les concurrents, et génère un site e-commerce complet 
              avec produits optimisés SEO, prêt à importer dans WooCommerce ou Shopify.
            </p>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <span className="font-semibold">100% Automatisé</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">Optimisé SEO</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                <span className="font-semibold">Multi-format</span>
              </div>
            </div>
          </div>
          
          {subscription && (
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {subscription.plan_type === 'monthly_unlimited' 
                ? 'Abonnement Actif' 
                : `${subscription.sites_remaining || 0} site(s) restant(s)`}
            </Badge>
          )}
        </div>
      </div>

      {/* Subscription Cards */}
      {!subscription && !skipSubscription && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Choisissez votre formule</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Paiement unique</h3>
                <div className="text-4xl font-bold text-primary mb-4">49€</div>
                <p className="text-muted-foreground mb-6">
                  Générez 1 site complet avec catalogue optimisé SEO
                </p>
                <ul className="text-sm text-left space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Recherche de niche IA</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Analyse concurrents SEO</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>10-500 produits générés</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Export CSV WooCommerce + Shopify</span>
                  </li>
                </ul>
                <Button className="w-full" size="lg">
                  Acheter maintenant
                </Button>
              </div>
            </Card>

            <Card className="p-6 border-primary border-2 hover:shadow-lg transition-shadow relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Populaire
              </Badge>
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Abonnement illimité</h3>
                <div className="text-4xl font-bold text-primary mb-1">199€</div>
                <div className="text-sm text-muted-foreground mb-4">par mois</div>
                <p className="text-muted-foreground mb-6">
                  Créez autant de sites que vous voulez
                </p>
                <ul className="text-sm text-left space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span><strong>Sites illimités</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Toutes les fonctionnalités</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>API prioritaire (rapide)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>Support premium</span>
                  </li>
                </ul>
                <Button className="w-full" size="lg" variant="default">
                  S'abonner
                </Button>
              </div>
            </Card>
          </div>

          {/* Skip button for testing */}
          <div className="text-center mt-6">
            <Button 
              variant="ghost" 
              onClick={() => setSkipSubscription(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              Ignorer pour l'instant (mode test)
            </Button>
          </div>
        </div>
      )}

      {/* Wizard */}
      {subscription || skipSubscription ? (
        <GeneratorWizard />
      ) : null}
    </div>
  );
}
