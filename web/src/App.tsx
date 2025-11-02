import { useState } from 'react'
import { TransactionList } from './components/TransactionList'
import { ProductShow } from './components/ProductShow'
import { ProductStatsComponent } from './components/ProductStats'

type Page = 'transactions' | 'stats';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('transactions');
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  const handleProductClick = (sku: string) => {
    setSelectedSku(sku);
  };

  const handleBackToList = () => {
    setSelectedSku(null);
  };

  // Show product detail page if a product is selected
  if (selectedSku) {
    return <ProductShow sku={selectedSku} onBack={handleBackToList} />
  }

  // Navigation bar
  const NavBar = () => (
    <div className="w-full bg-slate-900 border-b border-slate-700">
      <div className="px-8 py-4 flex gap-4">
        <button
          onClick={() => setCurrentPage('transactions')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            currentPage === 'transactions'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
        >
          Transactions
        </button>
        <button
          onClick={() => setCurrentPage('stats')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            currentPage === 'stats'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
        >
          Product Stats
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950">
      <NavBar />
      {currentPage === 'transactions' ? (
        <TransactionList onProductClick={handleProductClick} />
      ) : (
        <ProductStatsComponent onProductClick={handleProductClick} />
      )}
    </div>
  );
}

export default App
