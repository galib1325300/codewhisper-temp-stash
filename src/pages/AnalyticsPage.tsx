import React from 'react';
import { useParams } from 'react-router-dom';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';
import ShopNavigation from '../components/ShopNavigation';

const AnalyticsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <ShopNavigation shopName="Analytics SEO" />
        <AnalyticsDashboard shopId={id} />
      </div>
    </div>
  );
};

export default AnalyticsPage;