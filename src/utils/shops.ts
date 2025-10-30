import { supabase } from '@/integrations/supabase/client';
import { Shop } from './types';

export const getShops = async (): Promise<Shop[]> => {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching shops:', error);
    return [];
  }

  return data.map(shop => ({
    id: shop.id,
    name: shop.name,
    type: shop.type,
    status: shop.status as 'publish' | 'draft' | 'pending' | 'private',
    url: shop.url,
    language: shop.language,
    consumerKey: shop.consumer_key || '',
    consumerSecret: shop.consumer_secret || '',
    wpUsername: shop.wp_username || '',
    wpPassword: shop.wp_password || '',
    collectionsSlug: shop.collections_slug || '',
    productsSlug: shop.products_slug || 'products',
    openaiApiKey: shop.openai_api_key || '',
    analyticsEnabled: shop.analytics_enabled || false,
    jetpackAccessToken: shop.jetpack_access_token || '',
    shopifyAccessToken: shop.shopify_access_token || ''
  }));
};

export const addShop = async (shopData: Omit<Shop, 'id'>): Promise<Shop> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Utilisateur non authentifié');
  }

  const { data, error } = await supabase
    .from('shops')
    .insert({
      user_id: user.id,
      name: shopData.name,
      type: shopData.type,
      status: shopData.status,
      url: shopData.url,
      language: shopData.language,
      consumer_key: shopData.consumerKey,
      consumer_secret: shopData.consumerSecret,
      wp_username: shopData.wpUsername,
      wp_password: shopData.wpPassword,
      collections_slug: shopData.collectionsSlug,
      products_slug: shopData.productsSlug,
      openai_api_key: shopData.openaiApiKey,
      analytics_enabled: shopData.analyticsEnabled,
      jetpack_access_token: shopData.jetpackAccessToken,
      shopify_access_token: shopData.shopifyAccessToken
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erreur lors de la création de la boutique: ${error.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    type: data.type,
    status: data.status as 'publish' | 'draft' | 'pending' | 'private',
    url: data.url,
    language: data.language,
    consumerKey: data.consumer_key || '',
    consumerSecret: data.consumer_secret || '',
    wpUsername: data.wp_username || '',
    wpPassword: data.wp_password || '',
    collectionsSlug: data.collections_slug || '',
    productsSlug: data.products_slug || 'products',
    openaiApiKey: data.openai_api_key || '',
    analyticsEnabled: data.analytics_enabled || false,
    jetpackAccessToken: data.jetpack_access_token || '',
    shopifyAccessToken: data.shopify_access_token || ''
  };
};

export const updateShop = async (id: string, updates: Partial<Shop>): Promise<Shop> => {
  const { data, error } = await supabase
    .from('shops')
    .update({
      name: updates.name,
      type: updates.type,
      status: updates.status,
      url: updates.url,
      language: updates.language,
      consumer_key: updates.consumerKey,
      consumer_secret: updates.consumerSecret,
      wp_username: updates.wpUsername,
      wp_password: updates.wpPassword,
      collections_slug: updates.collectionsSlug,
      products_slug: updates.productsSlug,
      openai_api_key: updates.openaiApiKey,
      analytics_enabled: updates.analyticsEnabled,
      jetpack_access_token: updates.jetpackAccessToken,
      shopify_access_token: updates.shopifyAccessToken
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Erreur lors de la mise à jour de la boutique: ${error.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    type: data.type,
    status: data.status as 'publish' | 'draft' | 'pending' | 'private',
    url: data.url,
    language: data.language,
    consumerKey: data.consumer_key || '',
    consumerSecret: data.consumer_secret || '',
    wpUsername: data.wp_username || '',
    wpPassword: data.wp_password || '',
    collectionsSlug: data.collections_slug || '',
    productsSlug: data.products_slug || 'products',
    openaiApiKey: data.openai_api_key || '',
    analyticsEnabled: data.analytics_enabled || false,
    jetpackAccessToken: data.jetpack_access_token || '',
    shopifyAccessToken: data.shopify_access_token || ''
  };
};

export const removeShop = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('shops')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Erreur lors de la suppression de la boutique: ${error.message}`);
  }
};

export const getShopById = async (id: string): Promise<Shop | null> => {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching shop:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    type: data.type,
    status: data.status as 'publish' | 'draft' | 'pending' | 'private',
    url: data.url,
    language: data.language,
    consumerKey: data.consumer_key || '',
    consumerSecret: data.consumer_secret || '',
    wpUsername: data.wp_username || '',
    wpPassword: data.wp_password || '',
    collectionsSlug: data.collections_slug || '',
    productsSlug: data.products_slug || 'products',
    openaiApiKey: data.openai_api_key || '',
    analyticsEnabled: data.analytics_enabled || false,
    jetpackAccessToken: data.jetpack_access_token || '',
    shopifyAccessToken: data.shopify_access_token || ''
  };
};