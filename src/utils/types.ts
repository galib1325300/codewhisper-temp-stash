export interface Shop {
  id: string;
  name: string;
  type: string;
  status: 'publish' | 'draft' | 'pending' | 'private';
  url: string;
  language: string;
  consumerKey: string;
  consumerSecret: string;
  wpUsername: string;
  wpPassword: string;
  collectionsSlug: string;
  productsSlug: string;
  openaiApiKey?: string;
  analyticsEnabled: boolean;
  jetpackAccessToken?: string;
  shopifyAccessToken?: string;
}

export interface DashboardStats {
  products: number;
  collections: number;
  blogPosts: number;
  unpublishedChanges: number;
  revenue: string;
  orders: number;
  averageCart: string;
  customers: number;
  productsSold: number;
  refunds: number;
  countries: string[];
}

export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  status: string;
  featured: boolean;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: any[];
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: WooCommerceCategory[];
  tags: any[];
  images: WooCommerceImage[];
  attributes: any[];
  default_attributes: any[];
  variations: number[];
  grouped_products: any[];
  menu_order: number;
  meta_data: any[];
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
}

export interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  display: string;
  image: {
    id: number;
    date_created: string;
    date_created_gmt: string;
    date_modified: string;
    date_modified_gmt: string;
    src: string;
    name: string;
    alt: string;
  } | null;
  menu_order: number;
  count: number;
}

export interface WooCommerceImage {
  id: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  src: string;
  name: string;
  alt: string;
  position: number;
}