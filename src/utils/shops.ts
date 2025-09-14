import { Shop } from './types';

const SHOPS_STORAGE_KEY = 'shops';

export const getShops = (): Shop[] => {
  const shopsData = localStorage.getItem(SHOPS_STORAGE_KEY);
  return shopsData ? JSON.parse(shopsData) : [];
};

export const addShop = (shopData: Omit<Shop, 'id'>): Shop => {
  const shops = getShops();
  const newShop = {
    ...shopData,
    id: Date.now().toString()
  };

  shops.push(newShop);
  localStorage.setItem(SHOPS_STORAGE_KEY, JSON.stringify(shops));
  return newShop;
};

export const updateShop = (id: string, updates: Partial<Shop>): Shop => {
  const shops = getShops();
  const index = shops.findIndex(shop => shop.id === id);
  
  if (index === -1) {
    throw new Error('Boutique non trouvée');
  }

  const updatedShop = {
    ...shops[index],
    ...updates
  };

  shops[index] = updatedShop;
  localStorage.setItem(SHOPS_STORAGE_KEY, JSON.stringify(shops));
  return updatedShop;
};

export const removeShop = (id: string): void => {
  const shops = getShops().filter(shop => shop.id !== id);
  localStorage.setItem(SHOPS_STORAGE_KEY, JSON.stringify(shops));
};

export const getShopById = (id: string): Shop | undefined => {
  return getShops().find(shop => shop.id === id);
};