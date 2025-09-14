import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Globe, FileText, Store, Plus } from 'lucide-react';
import { getShops } from '../utils/shops';

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  subLabel?: string;
}

function SidebarLink({ to, icon, label, active, subLabel }: SidebarLinkProps) {
  return (
    <Link
      to={to}
      className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
        active ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {icon}
      <div className="ml-3">
        <span className="font-medium">{label}</span>
        {subLabel && (
          <span className="block text-xs text-gray-500">{subLabel}</span>
        )}
      </div>
    </Link>
  );
}

export default function AdminSidebar() {
  const location = useLocation();
  const shops = getShops();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-4">
        <div className="space-y-1">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            GÉNÉRAL
          </h2>
          <SidebarLink
            to="/admin"
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Dashboard"
            active={location.pathname === '/admin'}
          />
          <SidebarLink
            to="/admin/scraping"
            icon={<Globe className="w-5 h-5" />}
            label="Scraping"
            active={location.pathname === '/admin/scraping'}
          />
          <SidebarLink
            to="/admin/files"
            icon={<FileText className="w-5 h-5" />}
            label="Fiches produits"
            subLabel="via csv"
            active={location.pathname === '/admin/files'}
          />
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              MES BOUTIQUES
            </h2>
            <Link
              to="/admin/shops/new"
              className="p-1 hover:bg-gray-100 rounded-lg text-indigo-600 hover:text-indigo-700"
              title="Ajouter une boutique"
            >
              <Plus className="w-4 h-4" />
            </Link>
          </div>
          
          {shops.length > 0 ? (
            <div className="space-y-1">
              {shops.map((shop) => (
                <Link
                  key={shop.id}
                  to={`/admin/shops/${shop.id}`}
                  className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                    location.pathname.includes(`/admin/shops/${shop.id}`) 
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Store className="w-5 h-5 mr-3" />
                  <div>
                    <span className="font-medium text-sm">{shop.name}</span>
                    <span className="block text-xs text-gray-500">{shop.type}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">Aucune boutique</p>
              <Link
                to="/admin/shops/new"
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Ajouter une boutique
              </Link>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}