export interface Transaction {
  name: string;
  sku: string;
  material: string;
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
  event_time: string;
  quantity: number;
  price: number;
  spot_premium_percentage: number;
  spot_premium_dollar: number;
  event_type: string | null;
}

export interface ProductDetailsResponse {
  product: Product;
  transactions: ProductTransaction[];
}
