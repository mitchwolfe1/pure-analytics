import { useEffect, useState } from "react";
import type { ProductStats } from "../types";
import { fetchProductStats } from "../api";

function getMaterialBadgeClass(material: string): string {
  const materialLower = material.toLowerCase();

  if (materialLower.includes("gold")) {
    return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
  }
  if (materialLower.includes("silver")) {
    return "bg-slate-500/20 text-slate-300 border border-slate-500/30";
  }
  if (materialLower.includes("platinum")) {
    return "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30";
  }
  if (materialLower.includes("palladium")) {
    return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
  }

  // Default badge style
  return "bg-gray-500/20 text-gray-300 border border-gray-500/30";
}

type SortColumn =
  | "material"
  | "name"
  | "transaction_count"
  | "buy_count"
  | "sell_count"
  | "buy_sell_ratio"
  | "total_volume"
  | "total_buy_quantity"
  | "total_sell_quantity"
  | "total_buy_amount"
  | "total_sell_amount";
type SortDirection = "asc" | "desc";

interface ProductStatsProps {
  onProductClick: (sku: string) => void;
}

export function ProductStatsComponent({ onProductClick }: ProductStatsProps) {
  const [products, setProducts] = useState<ProductStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("total_volume");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadProductStats() {
      try {
        setLoading(true);
        const data = await fetchProductStats();
        setProducts(data.products);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load product stats",
        );
      } finally {
        setLoading(false);
      }
    }

    loadProductStats();
  }, []);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const uniqueMaterials = Array.from(
    new Set(products.map((p) => p.material))
  ).sort();

  const toggleMaterial = (material: string) => {
    const newSelected = new Set(selectedMaterials);
    if (newSelected.has(material)) {
      newSelected.delete(material);
    } else {
      newSelected.add(material);
    }
    setSelectedMaterials(newSelected);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMaterial = selectedMaterials.size === 0 || selectedMaterials.has(product.material);
    return matchesSearch && matchesMaterial;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case "material":
        aValue = a.material.toLowerCase();
        bValue = b.material.toLowerCase();
        break;
      case "name":
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case "transaction_count":
        aValue = a.transaction_count;
        bValue = b.transaction_count;
        break;
      case "buy_count":
        aValue = a.buy_count;
        bValue = b.buy_count;
        break;
      case "sell_count":
        aValue = a.sell_count;
        bValue = b.sell_count;
        break;
      case "buy_sell_ratio":
        aValue = a.buy_sell_ratio ?? -1; // Sort nulls last
        bValue = b.buy_sell_ratio ?? -1;
        break;
      case "total_volume":
        aValue = a.total_volume ?? 0;
        bValue = b.total_volume ?? 0;
        break;
      case "total_buy_quantity":
        aValue = a.total_buy_quantity ?? 0;
        bValue = b.total_buy_quantity ?? 0;
        break;
      case "total_sell_quantity":
        aValue = a.total_sell_quantity ?? 0;
        bValue = b.total_sell_quantity ?? 0;
        break;
      case "total_buy_amount":
        aValue = a.total_buy_amount ?? 0;
        bValue = b.total_buy_amount ?? 0;
        break;
      case "total_sell_amount":
        aValue = a.total_sell_amount ?? 0;
        bValue = b.total_sell_amount ?? 0;
        break;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <span className="text-gray-500 ml-1">⇅</span>;
    }
    return sortDirection === "asc" ? (
      <span className="ml-1">↑</span>
    ) : (
      <span className="ml-1">↓</span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-xl text-white">Loading product statistics...</div>
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

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-xl text-white">No product statistics found</div>
      </div>
    );
  }

  const totalVolume = filteredProducts.reduce(
    (sum, p) => sum + (p.total_volume ?? 0),
    0,
  );
  const totalTransactions = filteredProducts.reduce(
    (sum, p) => sum + p.transaction_count,
    0,
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="w-full px-8 py-8">
        <h1 className="text-4xl font-medium mb-6 text-white">
          Product Statistics
        </h1>

        <div className="flex gap-4 mb-6">
          <div className="bg-slate-900 rounded-lg p-4">
            <span className="text-lg font-medium text-white">
              Total Products: {filteredProducts.length}
              {(searchQuery || selectedMaterials.size > 0) && ` (of ${products.length})`}
            </span>
          </div>
          <div className="bg-slate-900 rounded-lg p-4">
            <span className="text-lg font-medium text-white">
              Total Transactions: {totalTransactions}
            </span>
          </div>
          <div className="bg-slate-900 rounded-lg p-4">
            <span className="text-lg font-medium text-white">
              Total Volume: $
              {(totalVolume / 100)
                .toFixed(2)
                .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md px-4 py-2 bg-slate-900 text-white border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-slate-400"
          />
        </div>

        <div className="mb-6">
          <div className="text-sm font-medium text-gray-300 mb-3">Filter by Material:</div>
          <div className="flex flex-wrap gap-3">
            {uniqueMaterials.map((material) => (
              <label
                key={material}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={selectedMaterials.has(material)}
                  onChange={() => toggleMaterial(material)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
                />
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getMaterialBadgeClass(material)} group-hover:ring-2 group-hover:ring-emerald-500/50 transition-all cursor-pointer`}
                >
                  {material}
                </span>
              </label>
            ))}
            {selectedMaterials.size > 0 && (
              <button
                onClick={() => setSelectedMaterials(new Set())}
                className="px-3 py-1 text-xs text-slate-400 hover:text-white border border-slate-600 rounded-full hover:border-slate-500 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full bg-slate-900">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th
                  className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                  onClick={() => handleSort("material")}
                >
                  Material <SortIcon column="material" />
                </th>
                <th
                  className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                  onClick={() => handleSort("name")}
                >
                  Product Name <SortIcon column="name" />
                </th>
                <th
                  className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                  onClick={() => handleSort("transaction_count")}
                >
                  # Transactions <SortIcon column="transaction_count" />
                </th>
                <th
                  className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                  onClick={() => handleSort("total_volume")}
                >
                  Volume <SortIcon column="total_volume" />
                </th>
                <th
                  className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                  onClick={() => handleSort("buy_count")}
                >
                  # Buys <SortIcon column="buy_count" />
                </th>
                <th
                  className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                  onClick={() => handleSort("sell_count")}
                >
                  # Sells <SortIcon column="sell_count" />
                </th>
                <th
                  className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                  onClick={() => handleSort("buy_sell_ratio")}
                >
                  Buy/Sell Ratio <SortIcon column="buy_sell_ratio" />
                </th>
                <th
                  className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                  onClick={() => handleSort("total_buy_quantity")}
                >
                  Total Buy Qty <SortIcon column="total_buy_quantity" />
                </th>
                <th
                  className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                  onClick={() => handleSort("total_sell_quantity")}
                >
                  Total Sell Qty <SortIcon column="total_sell_quantity" />
                </th>
                <th
                  className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                  onClick={() => handleSort("total_buy_amount")}
                >
                  Total Buy Amount <SortIcon column="total_buy_amount" />
                </th>
                <th
                  className="px-6 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-slate-700 transition-colors select-none"
                  onClick={() => handleSort("total_sell_amount")}
                >
                  Total Sell Amount <SortIcon column="total_sell_amount" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {sortedProducts.map((product, index) => (
                <tr
                  key={index}
                  className="hover:bg-slate-700 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getMaterialBadgeClass(product.material)}`}
                    >
                      {product.material}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    <button
                      onClick={() => onProductClick(product.sku)}
                      className="text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer text-left"
                    >
                      {product.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {product.transaction_count}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    $
                    {product.total_volume !== null
                      ? (product.total_volume / 100)
                          .toFixed(2)
                          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      : "0.00"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {product.buy_count}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {product.sell_count}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {product.buy_sell_ratio !== null
                      ? product.buy_sell_ratio.toFixed(2)
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {product.total_buy_quantity ?? 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {product.total_sell_quantity ?? 0}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    $
                    {product.total_buy_amount !== null
                      ? (product.total_buy_amount / 100)
                          .toFixed(2)
                          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      : "0.00"}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    $
                    {product.total_sell_amount !== null
                      ? (product.total_sell_amount / 100)
                          .toFixed(2)
                          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      : "0.00"}
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
