import React from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';

interface ShopNavigationProps {
  shopName: string;
}

export default function ShopNavigation({ shopName }: ShopNavigationProps) {
  const { id } = useParams();
  const location = useLocation();

  const tabs = [
    { name: 'Dashboard', path: `/admin/shops/${id}` },
    { name: 'Produits', path: `/admin/shops/${id}/products` },
    { name: 'Collections', path: `/admin/shops/${id}/collections` },
    { name: 'Blog', path: `/admin/shops/${id}/blog` },
    { name: 'Diagnostics', path: `/admin/shops/${id}/diagnostics` },
    { name: 'Analytics', path: `/admin/shops/${id}/analytics` },
    { name: 'Scraping', path: `/admin/shops/${id}/scraping` },
    { name: 'Paramètres', path: `/admin/shops/${id}/settings` }
  ];

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {shopName}
      </h1>
      <nav className="flex space-x-4 bg-gray-100 p-1 rounded-lg">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}