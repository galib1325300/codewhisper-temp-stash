import React, { useState } from 'react';
import { Bot, Search, ShoppingBag, Rocket, Clock, BarChart, DollarSign, Target, Languages } from 'lucide-react';
import Navbar from '../components/Navbar';
import Button from '../components/Button';

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex items-center space-x-4 mb-4">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Icon className="w-6 h-6 text-indigo-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
      </div>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function BenefitCard({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) {
  return (
    <div className="flex flex-col items-center text-center p-6">
      <div className="p-3 bg-indigo-100 rounded-full mb-4">
        <Icon className="w-8 h-8 text-indigo-600" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />
      
      {/* Hero Section */}
      <header className="container mx-auto px-4 py-16 md:py-24 pt-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Dominez le SEO avec l'Intelligence Artificielle
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Automatisez votre stratégie de contenu, analysez vos concurrents et boostez votre référencement naturel
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleStartNow}>
              Commencer Maintenant
            </Button>
            <Button variant="secondary" onClick={handleRequestDemo}>
              Demander une Démo
            </Button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Révolutionnez votre SEO
          </h2>
          <p className="text-xl text-gray-600">
            Des outils puissants pour dominer les résultats de recherche
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={Bot}
            title="IA Avancée"
            description="Génération automatique de contenu SEO optimisé grâce à l'intelligence artificielle de pointe"
          />
          <FeatureCard
            icon={Search}
            title="Analyse Concurrentielle"
            description="Surveillez vos concurrents et découvrez leurs stratégies SEO gagnantes"
          />
          <FeatureCard
            icon={ShoppingBag}
            title="E-commerce SEO"
            description="Optimisez vos fiches produits et descriptions pour maximiser vos ventes"
          />
          <FeatureCard
            icon={Languages}
            title="Multi-langues"
            description="Créez du contenu optimisé dans plus de 25 langues différentes"
          />
          <FeatureCard
            icon={BarChart}
            title="Analyses Détaillées"
            description="Suivez vos performances et mesurez l'impact de vos optimisations"
          />
          <FeatureCard
            icon={Rocket}
            title="Résultats Rapides"
            description="Voyez vos classements s'améliorer en quelques semaines seulement"
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
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Tarifs Transparents
          </h2>
          <p className="text-xl text-gray-600">
            Commencez gratuitement, évoluez selon vos besoins
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 border-4 border-indigo-200">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Plan Pro</h3>
              <div className="text-4xl font-bold text-indigo-600 mb-4">49€<span className="text-lg text-gray-500">/mois</span></div>
              <p className="text-gray-600 mb-8">Tout ce dont vous avez besoin pour dominer votre marché</p>
              
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></div>
                  Génération illimitée de contenu SEO
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></div>
                  Analyse concurrentielle avancée
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></div>
                  Support multilingue (25+ langues)
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></div>
                  Intégration e-commerce complète
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full mr-3"></div>
                  Support prioritaire 24/7
                </li>
              </ul>
              
              <Button onClick={handleFreeStart} className="w-full text-lg py-3">
                Commencer l'Essai Gratuit
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-4">Prêt à dominer Google ?</h3>
          <p className="text-gray-300 mb-8">
            Rejoignez des milliers d'entreprises qui font confiance à Magic SEO
          </p>
          <Button onClick={handleStartNow} variant="white">
            Démarrer Maintenant
          </Button>
        </div>
      </footer>
    </div>
  );
}