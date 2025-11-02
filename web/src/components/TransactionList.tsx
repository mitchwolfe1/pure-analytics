import { useEffect, useState } from 'react';
import type { Transaction } from '../types';
import { fetchTransactions } from '../api';

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

  // Default badge style
  return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
}

type SortColumn = 'event_time' | 'material' | 'name' | 'quantity' | 'price' | 'total' | 'spot_premium_percentage' | 'spot_premium_dollar' | 'event_type';
type SortDirection = 'asc' | 'desc';

interface TransactionListProps {
  onProductClick: (productId: string) => void;
}

export function TransactionList({ onProductClick }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('event_time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    async function loadTransactions() {
      try {
        setLoading(true);
        const data = await fetchTransactions();
        setTransactions(data.transactions);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load transactions');
      } finally {
        setLoading(false);
      }
    }

    loadTransactions();
  }, []);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case 'event_time':
        aValue = new Date(a.event_time).getTime();
        bValue = new Date(b.event_time).getTime();
        break;
      case 'material':
        aValue = a.material.toLowerCase();
        bValue = b.material.toLowerCase();
        break;
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
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
  });

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
        <div className="text-xl text-white">Loading transactions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-xl text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-xl text-white">No transactions found</div>
      </div>
    );
  }

  const totalVolume = transactions.reduce((sum, tx) => sum + (tx.quantity * tx.price / 100), 0);

  const firstTransactionDate = transactions.length > 0
    ? Math.min(...transactions.map(tx => new Date(tx.event_time).getTime()))
    : Date.now();
  const daysScanned = Math.floor((Date.now() - firstTransactionDate) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="w-full px-8 py-8">
        <h1 className="text-4xl font-medium mb-6 text-white">Pure Market Transactions</h1>

        <div className="flex gap-4 mb-6">
          <div className="bg-slate-900 rounded-lg p-4">
            <span className="text-lg font-medium text-white">
              Total Transactions: {transactions.length}
            </span>
          </div>
          <div className="bg-slate-900 rounded-lg p-4">
            <span className="text-lg font-medium text-white">
              Total Volume: ${totalVolume.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            </span>
          </div>
          <div className="bg-slate-900 rounded-lg p-4">
            <span className="text-lg font-medium text-white">
              Days Scanned: {daysScanned}
            </span>
          </div>
        </div>

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
                  onClick={() => handleSort('material')}
                >
                  Material <SortIcon column="material" />
                </th>
                <th
                  className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                  onClick={() => handleSort('name')}
                >
                  Product <SortIcon column="name" />
                </th>
                <th
                  className="px-6 py-3 text-left text-sm font-semibold"
                >
                  Variant
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
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getMaterialBadgeClass(tx.material)}`}>
                      {tx.material}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    <button
                      onClick={() => onProductClick(tx.pure_product_id)}
                      className="text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer text-left"
                    >
                      {tx.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{tx.variant_label}</td>
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
                    {(tx.event_type || tx.variant_label === 'Pure Priority') && (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        tx.event_type === 'buy' || tx.variant_label === 'Pure Priority'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : tx.event_type === 'sell'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {tx.variant_label === 'Pure Priority' ? 'BUY' : tx.event_type?.toUpperCase()}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
