import { useState } from 'react'
import { TransactionList } from './components/TransactionList'
import { ProductShow } from './components/ProductShow'

function App() {
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  if (selectedSku) {
    return <ProductShow sku={selectedSku} onBack={() => setSelectedSku(null)} />
  }

  return <TransactionList onProductClick={(sku) => setSelectedSku(sku)} />
}

export default App
