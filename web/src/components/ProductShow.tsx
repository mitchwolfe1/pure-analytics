import { useEffect, useState } from 'react';
import type { ProductDetailsResponse, ProductTransaction } from '../types';
import { fetchProductDetails } from '../api';

function getMaterialBadgeClass(material: string): string {
  const materialLower = material.toLowerCase();

  if (materialLower.includes('gold')) {
    return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
  }
  if (materialLower.includes('silver')) {
    return 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
  }
  if (materialLower.includes('platinum')) {
    return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
  }
  if (materialLower.includes('palladium')) {
    return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
  }

  return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
}

type SortColumn = 'event_time' | 'quantity' | 'price' | 'total' | 'spot_premium_percentage' | 'spot_premium_dollar' | 'event_type';
type SortDirection = 'asc' | 'desc';

interface ProductShowProps {
  sku: string;
  onBack: () => void;
}

export function ProductShow({ sku, onBack }: ProductShowProps) {
  const [data, setData] = useState<ProductDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('event_time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    async function loadProductDetails() {
      try {
        setLoading(true);
        const productData = await fetchProductDetails(sku);
        setData(productData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product details');
      } finally {
        setLoading(false);
      }
    }

    loadProductDetails();
  }, [sku]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedTransactions = data ? [...data.transactions].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case 'event_time':
        aValue = new Date(a.event_time).getTime();
        bValue = new Date(b.event_time).getTime();
        break;
      case 'quantity':
        aValue = a.quantity;
        bValue = b.quantity;
        break;
      case 'price':
        aValue = a.price;
        bValue = b.price;
        break;
      case 'total':
        aValue = a.quantity * a.price;
        bValue = b.quantity * b.price;
        break;
      case 'spot_premium_percentage':
        aValue = a.spot_premium_percentage;
        bValue = b.spot_premium_percentage;
        break;
      case 'spot_premium_dollar':
        aValue = a.spot_premium_dollar;
        bValue = b.spot_premium_dollar;
        break;
      case 'event_type':
        aValue = a.event_type || 'zzz'; // Sort nulls last
        bValue = b.event_type || 'zzz';
        break;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  }) : [];

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <span className="text-gray-500 ml-1">⇅</span>;
    }
    return sortDirection === 'asc' ? (
      <span className="ml-1">↑</span>
    ) : (
      <span className="ml-1">↓</span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-xl text-white">Loading product details...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900">
        <div className="text-xl text-red-400 mb-4">Error: {error || 'Product not found'}</div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          ← Back to Transactions
        </button>
      </div>
    );
  }

  const totalVolume = data.transactions.reduce((sum, tx) => sum + (tx.quantity * tx.price / 100), 0);
  const totalQuantity = data.transactions.reduce((sum, tx) => sum + tx.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="w-full px-8 py-8">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors mb-4"
          >
            ← Back to Transactions
          </button>

          <h1 className="text-4xl font-medium mb-4 text-white">{data.product.name}</h1>

          <div className="bg-slate-900 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">SKU</div>
                <div className="text-lg font-medium text-white">{data.product.sku}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Material</div>
                <div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getMaterialBadgeClass(data.product.material)}`}>
                    {data.product.material}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Variant</div>
                <div className="text-lg font-medium text-white">
                  {data.product.variant_label}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">External Link</div>
                <a
                  href={`https://www.collectpure.com/marketplace/product/${data.product.sku}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 text-sm"
                >
                  View on Pure →
                </a>
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-medium mb-4 text-white">Transaction History</h2>

        <div className="flex gap-4 mb-6">
          <div className="bg-slate-900 rounded-lg p-4">
            <span className="text-lg font-medium text-white">
              Total Transactions: {data.transactions.length}
            </span>
          </div>
          <div className="bg-slate-900 rounded-lg p-4">
            <span className="text-lg font-medium text-white">
              Total Quantity: {totalQuantity}
            </span>
          </div>
          <div className="bg-slate-900 rounded-lg p-4">
            <span className="text-lg font-medium text-white">
              Total Volume: ${totalVolume.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </span>
          </div>
        </div>

        {data.transactions.length === 0 ? (
          <div className="bg-slate-900 rounded-lg p-8 text-center">
            <div className="text-xl text-gray-400">No transactions found for this product</div>
          </div>
        ) : (
          <div className="overflow-x-auto shadow-md rounded-lg">
            <table className="min-w-full bg-slate-900">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                    onClick={() => handleSort('event_time')}
                  >
                    Date <SortIcon column="event_time" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                    onClick={() => handleSort('quantity')}
                  >
                    Quantity <SortIcon column="quantity" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                    onClick={() => handleSort('price')}
                  >
                    Rate <SortIcon column="price" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                    onClick={() => handleSort('total')}
                  >
                    Total Amount <SortIcon column="total" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                    onClick={() => handleSort('spot_premium_percentage')}
                  >
                    Premium % <SortIcon column="spot_premium_percentage" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                    onClick={() => handleSort('spot_premium_dollar')}
                  >
                    Premium $ <SortIcon column="spot_premium_dollar" />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                    onClick={() => handleSort('event_type')}
                  >
                    Type <SortIcon column="event_type" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {sortedTransactions.map((tx, index) => (
                  <tr key={index} className="hover:bg-slate-700 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {new Date(tx.event_time).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZoneName: 'short'
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{tx.quantity}</td>
                    <td className="px-6 py-4 text-sm font-medium text-white">
                      ${(tx.price / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-white">
                      ${((tx.quantity * tx.price) / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {tx.spot_premium_percentage.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      ${(tx.spot_premium_dollar / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {tx.event_type && (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          tx.event_type === 'buy'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : tx.event_type === 'sell'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}>
                          {tx.event_type.toUpperCase()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
