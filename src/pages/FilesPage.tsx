import React, { useState } from 'react';
import { Search, Download, Trash2, Eye, Upload } from 'lucide-react';
import AdminNavbar from '../components/AdminNavbar';
import AdminSidebar from '../components/AdminSidebar';
import Button from '../components/Button';

export default function FilesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Fiches produits</h1>
              <p className="text-gray-600">Importez et traitez vos fichiers CSV pour générer des descriptions</p>
            </div>

            {/* Zone de drop */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Importez vos fichiers CSV
                </h3>
                <p className="text-gray-600 mb-4">
                  Glissez-déposez vos fichiers CSV ici ou cliquez pour sélectionner
                </p>
                <Button>
                  Sélectionner des fichiers
                </Button>
              </div>
            </div>

            {/* Liste des fichiers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Fichiers importés</h2>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Rechercher un fichier..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="text-center py-8 text-gray-500">
                  <p>Aucun fichier importé</p>
                  <p className="text-sm">Importez votre premier fichier CSV pour commencer</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}