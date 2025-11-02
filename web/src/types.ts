export interface Transaction {
  pure_product_id: string;
  name: string;
  sku: string;
  material: string;
  variant_label: string;
  event_time: string;
  quantity: number;
  price: number;
  spot_premium_percentage: number;
  spot_premium_dollar: number;
  event_type: string | null;
}

export interface TransactionsResponse {
  transactions: Transaction[];
}

export interface Product {
  name: string;
  sku: string;
  material: string;
  variant_label: string;
}

export interface ProductTransaction {
  sku: string;
  variant_label: string;
  event_time: string;
  quantity: number;
  price: number;
  spot_premium_percentage: number;
  spot_premium_dollar: number;
  event_type: string | null;
}

export interface ProductDetailsResponse {
  variants: Product[];
  transactions: ProductTransaction[];
}

export interface ProductStats {
  pure_product_id: string;
  material: string;
  name: string;
  sku: string;
  transaction_count: number;
  buy_count: number;
  sell_count: number;
  buy_sell_ratio: number | null;
  total_volume: number | null;
  total_buy_quantity: number | null;
  total_sell_quantity: number | null;
  total_buy_amount: number | null;
  total_sell_amount: number | null;
}

export interface ProductStatsResponse {
  products: ProductStats[];
}
