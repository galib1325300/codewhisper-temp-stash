import React, { useState } from 'react';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import Button from '../components/Button';
import { Download, Trash2 } from 'lucide-react';

export default function ScrapingPage() {
  const [storeUrl, setStoreUrl] = useState('');
  const [error, setError] = useState('');

  const handleStartScraping = () => {
    if (!storeUrl) {
      setError('Veuillez entrer une URL de boutique');
      return;
    }

    try {
      new URL(storeUrl);
      setError('');
      // Logique de scraping à implémenter
      console.log('Démarrage du scraping pour:', storeUrl);
    } catch {
      setError('URL invalide');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Scraping de boutique</h1>
              <p className="text-gray-600">Scrapez une boutique Shopify pour récupérer ses produits</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <label htmlFor="storeUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  URL de la boutique Shopify
                </label>
                <div className="flex space-x-4">
                  <input
                    type="url"
                    id="storeUrl"
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    placeholder="https://exemple.myshopify.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <Button onClick={handleStartScraping}>
                    Commencer le scraping
                  </Button>
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique des scrapings</h3>
                <div className="text-center py-8 text-gray-500">
                  <p>Aucun scraping effectué pour le moment</p>
                  <p className="text-sm">Commencez par scraper une boutique ci-dessus</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}