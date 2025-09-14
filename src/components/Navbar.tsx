import React, { useState } from 'react';
import { Wand2 } from 'lucide-react';
import Button from './Button';
import LoginModal from './LoginModal';

export default function Navbar() {
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLogin = () => {
    setShowLoginModal(true);
  };

  const handleSubscribe = () => {
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <nav className="fixed w-full bg-white/80 backdrop-blur-md shadow-sm z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div 
              className="flex items-center space-x-2 cursor-pointer" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <Wand2 className="w-8 h-8 text-indigo-600" />
              <span className="text-2xl font-bold text-gray-900">MAGIC SEO</span>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="secondary" onClick={handleLogin}>
                Se connecter
              </Button>
              <Button variant="primary" onClick={handleSubscribe}>
                S'abonner - 49€/mois
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />
    </>
  );
}