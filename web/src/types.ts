export interface Transaction {
  name: string;
  sku: string;
  material: string;
  event_time: string;
  quantity: number;
  price: number;
  spot_premium_percentage: number;
  spot_premium_dollar: number;
}

export interface TransactionsResponse {
  transactions: Transaction[];
}
