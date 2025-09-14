import React, { useState } from 'react';
import { Bot, Search, ShoppingBag, Rocket, Clock, BarChart, DollarSign, Target, Languages, Sparkles, TrendingUp, Globe } from 'lucide-react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) {
  return (
    <div className="card-elevated p-6 interactive-hover group">
      <div className="flex items-center space-x-4 mb-4">
        <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function BenefitCard({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center text-center p-6 group">
      <div className="p-4 bg-primary/10 rounded-2xl mb-4 group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

export default function LandingPage() {
  const [showDemo, setShowDemo] = useState(false);

  const handleStartNow = () => {
    window.open('https://app.example.com/register', '_blank');
  };

  const handleRequestDemo = () => {
    setShowDemo(true);
    alert('Un représentant commercial vous contactera sous peu pour organiser une démonstration.');
  };

  const handleFreeStart = () => {
    window.open('https://app.example.com/free-trial', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-info/10">
      <Navbar />
      
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-16 md:py-24 pt-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-primary mr-2" />
            <span className="text-sm font-medium text-primary">Powered by AI</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Dominez le SEO avec
            <span className="text-gradient block mt-2">l'Intelligence Artificielle</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-2xl mx-auto">
            Automatisez votre stratégie de contenu, analysez vos concurrents et boostez votre référencement naturel grâce à l'IA de dernière génération
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleStartNow} className="btn-gradient text-lg px-8 py-3">
              Commencer Maintenant
            </Button>
            <Button variant="secondary" onClick={handleRequestDemo} className="text-lg px-8 py-3 border border-border hover:bg-muted/50">
              Demander une Démo
            </Button>
          </div>
          <div className="mt-8 text-sm text-muted-foreground">
            <span>✨ Essai gratuit de 14 jours • 🚀 Aucune carte requise • 💬 Support français</span>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-info/10 rounded-full mb-4">
            <TrendingUp className="w-4 h-4 text-info mr-2" />
            <span className="text-sm font-medium text-info">Révolutionnaire</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Révolutionnez votre SEO
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Des outils puissants alimentés par l'IA pour dominer les résultats de recherche et surpasser vos concurrents
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={Bot}
            title="IA Avancée GPT-5"
            description="Génération automatique de contenu SEO optimisé grâce aux derniers modèles d'intelligence artificielle"
          />
          <FeatureCard
            icon={Search}
            title="Analyse Concurrentielle"
            description="Surveillez vos concurrents en temps réel et découvrez leurs stratégies SEO gagnantes"
          />
          <FeatureCard
            icon={ShoppingBag}
            title="E-commerce SEO"
            description="Optimisez automatiquement vos fiches produits et descriptions pour maximiser vos ventes"
          />
          <FeatureCard
            icon={Globe}
            title="Multi-langues & Multi-pays"
            description="Créez du contenu optimisé dans plus de 25 langues avec adaptation culturelle locale"
          />
          <FeatureCard
            icon={BarChart}
            title="Analytics Prédictifs"
            description="Suivez vos performances et prédisez l'impact de vos optimisations avec l'IA"
          />
          <FeatureCard
            icon={Rocket}
            title="Résultats Ultra-Rapides"
            description="Observez vos classements s'améliorer en quelques jours grâce à notre technologie avancée"
          />
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pourquoi choisir Magic SEO ?
            </h2>
            <p className="text-xl opacity-90">
              Rejoignez des milliers d'entreprises qui ont transformé leur visibilité en ligne
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <BenefitCard
              icon={Clock}
              title="Gain de Temps"
              description="Automatisez 80% de vos tâches SEO répétitives"
            />
            <BenefitCard
              icon={DollarSign}
              title="ROI Prouvé"
              description="Augmentez vos revenus de 300% en moyenne"
            />
            <BenefitCard
              icon={Target}
              title="Précision"
              description="Ciblage ultra-précis des mots-clés rentables"
            />
            <BenefitCard
              icon={BarChart}
              title="Croissance"
              description="Multiplication du trafic organique par 5"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-success/10 rounded-full mb-4">
            <DollarSign className="w-4 h-4 text-success mr-2" />
            <span className="text-sm font-medium text-success">Offre Limitée</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tarifs Transparents
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Commencez gratuitement et évoluez selon vos besoins. Pas de frais cachés, pas d'engagement.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="card-elevated border-4 border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-info"></div>
            <div className="p-8 text-center">
              <div className="inline-flex items-center px-3 py-1 bg-primary/10 rounded-full mb-4">
                <span className="text-sm font-medium text-primary">🔥 PLUS POPULAIRE</span>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Plan Pro</h3>
              <div className="text-4xl font-bold text-primary mb-4">
                49€
                <span className="text-lg text-muted-foreground">/mois</span>
              </div>
              <p className="text-muted-foreground mb-8">
                Tout ce dont vous avez besoin pour dominer votre marché et surpasser vos concurrents
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 text-left mb-8">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-success rounded-full mr-3"></div>
                    <span className="text-foreground">Génération illimitée de contenu SEO</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-success rounded-full mr-3"></div>
                    <span className="text-foreground">Analyse concurrentielle en temps réel</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-success rounded-full mr-3"></div>
                    <span className="text-foreground">Support multilingue (25+ langues)</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-success rounded-full mr-3"></div>
                    <span className="text-foreground">Intégration e-commerce complète</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-success rounded-full mr-3"></div>
                    <span className="text-foreground">Analytics prédictifs avancés</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-success rounded-full mr-3"></div>
                    <span className="text-foreground">Support prioritaire 24/7</span>
                  </div>
                </div>
              </div>
              
              <Button onClick={handleFreeStart} className="btn-gradient w-full text-lg py-4 mb-4">
                🚀 Commencer l'Essai Gratuit
              </Button>
              <p className="text-sm text-muted-foreground">
                14 jours gratuits • Aucune carte requise • Annulation en un clic
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-primary/20 backdrop-blur-sm rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-primary mr-2" />
            <span className="text-sm font-medium text-primary">Rejoignez la révolution SEO</span>
          </div>
          <h3 className="text-2xl font-bold mb-4">Prêt à dominer Google ?</h3>
          <p className="text-background/80 mb-8 max-w-2xl mx-auto">
            Plus de 10,000 entreprises font confiance à Magic SEO pour transformer leur visibilité en ligne et multiplier leurs revenus
          </p>
          <Button onClick={handleStartNow} variant="white" className="text-lg px-8 py-3">
            🚀 Démarrer Maintenant - C'est Gratuit
          </Button>
          <p className="text-sm text-background/60 mt-4">
            Aucune carte requise • Support français • Résultats garantis ou remboursé
          </p>
        </div>
      </footer>
    </div>
  );
}