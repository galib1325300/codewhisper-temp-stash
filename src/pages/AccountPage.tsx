import React, { useState } from 'react';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import Button from '../components/Button';
import { Pencil, Key, User } from 'lucide-react';

export default function AccountPage() {
  const [email] = useState(localStorage.getItem('userEmail') || '');
  const [firstName, setFirstName] = useState('Romain');
  const [lastName, setLastName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [apiKey, setApiKey] = useState('sk-proj-UC12sjUGQICV1LWz5tZbS-DUlQi...');

  const handleSaveChanges = () => {
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Section Informations */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-500 to-purple-600">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Mes informations</h2>
                  </div>
                  <Button 
                    onClick={() => setIsEditing(!isEditing)}
                    variant="white"
                  >
                    {isEditing ? 'Annuler' : 'Éditer mes informations'}
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-6 flex justify-end">
                    <Button onClick={handleSaveChanges}>
                      Enregistrer les modifications
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Section Clé API */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Key className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Clé API OpenAI</h2>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Votre clé API OpenAI
                  </label>
                  <div className="flex space-x-4">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="sk-..."
                    />
                    <Button variant="secondary">
                      Vérifier
                    </Button>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    <strong>Information :</strong> Votre clé API OpenAI est utilisée pour générer du contenu via l'intelligence artificielle. Elle reste confidentielle et n'est jamais partagée.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}