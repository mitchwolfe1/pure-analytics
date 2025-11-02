import type { TransactionsResponse, ProductDetailsResponse, ProductStatsResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function fetchTransactions(): Promise<TransactionsResponse> {
  const response = await fetch(`${API_BASE_URL}/transactions`);

  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchProductDetails(productId: string): Promise<ProductDetailsResponse> {
  const response = await fetch(`${API_BASE_URL}/product/${encodeURIComponent(productId)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch product details: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchProductStats(): Promise<ProductStatsResponse> {
  const response = await fetch(`${API_BASE_URL}/products/stats`);

  if (!response.ok) {
    throw new Error(`Failed to fetch product stats: ${response.statusText}`);
  }

  return response.json();
}
