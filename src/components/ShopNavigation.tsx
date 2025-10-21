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
    { name: 'SEO+', path: `/admin/shops/${id}/seo-optimization` },
    { name: 'Historique', path: `/admin/shops/${id}/history` },
    { name: 'Scraping', path: `/admin/shops/${id}/scraping` },
    { name: 'Paramètres', path: `/admin/shops/${id}/settings` }
  ];

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">
        {shopName}
      </h1>
      <nav className="flex space-x-4 bg-muted p-1 rounded-lg overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
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