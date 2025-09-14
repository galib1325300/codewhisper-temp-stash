import React from 'react';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import { Check } from 'lucide-react';

export default function SubscriptionPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Abonnement</h1>
              <p className="text-gray-600">Gérez votre abonnement et vos crédits</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-4">
                  <Check className="w-4 h-4 mr-2" />
                  Plan Pro Actif
                </div>
                <h2 className="text-3xl font-bold text-gray-900">49€/mois</h2>
                <p className="text-gray-600">Facturé mensuellement</p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Votre utilisation</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Crédits utilisés ce mois</span>
                      <span className="font-semibold">450 / 2000</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '22.5%' }}></div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Avantages inclus</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-600">2000 crédits mensuels</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-600">Scraping illimité</span>
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-600">Support prioritaire</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-200 text-center">
                <p className="text-gray-600">
                  Prochain renouvellement le <strong>14 octobre 2025</strong>
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}