export type Product = {
  sku: string;
  provider: string;
  product_name: string;
  country_code: string;
  country_name: string;
  data_gb: number | null;
  data_display: string;
  validity_days: number;
  price: number;
  currency: string;
  network: string;
  top_up: boolean;
};