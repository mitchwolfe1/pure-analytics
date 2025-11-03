import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ProductTransaction } from "../types";

interface DailyData {
  date: string;
  buyAmount: number;
  sellAmount: number;
}

interface BuySellDemandChartProps {
  transactions: ProductTransaction[];
  compact?: boolean;
}

export const BuySellDemandChart: React.FC<BuySellDemandChartProps> = ({
  transactions,
  compact = false,
}) => {
  // Aggregate transactions by day
  const dailyData = useMemo(() => {
    const dataMap = new Map<
      string,
      { buyAmount: number; sellAmount: number }
    >();

    transactions.forEach((tx) => {
      // Extract date from timestamp (YYYY-MM-DD format)
      const date = tx.event_time.split("T")[0];

      // Calculate total amount (price is in cents, so convert to dollars)
      const amount = (tx.price * tx.quantity) / 100;

      if (!dataMap.has(date)) {
        dataMap.set(date, { buyAmount: 0, sellAmount: 0 });
      }

      const dayData = dataMap.get(date)!;

      // Treat "Pure Priority" variant as buys, matching the UI logic
      if (tx.event_type === "buy" || tx.variant_label === "Pure Priority") {
        dayData.buyAmount += amount;
      } else if (tx.event_type === "sell") {
        dayData.sellAmount += amount;
      }
    });

    // Convert map to array and sort by date
    const result: DailyData[] = Array.from(dataMap.entries())
      .map(([date, { buyAmount, sellAmount }]) => ({
        date,
        buyAmount: Math.round(buyAmount * 100) / 100, // Round to 2 decimals
        sellAmount: Math.round(sellAmount * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }, [transactions]);

  // Custom tooltip with dark theme
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-slate-300 font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: $
              {entry.value.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Format dollar amounts for Y-axis
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value}`;
  };

  // Format date for X-axis as MM/DD
  const formatXAxis = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  if (dailyData.length === 0) {
    return (
      <div className={compact ? "text-center" : "bg-slate-900/50 border border-slate-800 rounded-lg p-8 text-center"}>
        <p className="text-slate-400">No buy/sell data available</p>
      </div>
    );
  }

  return (
    <div className={compact ? "h-full" : "bg-slate-900/50 border border-slate-800 rounded-lg p-6"}>
      {!compact && (
        <h2 className="text-xl font-semibold text-slate-100 mb-4">
          Daily Buy & Sell Demand
        </h2>
      )}
      <ResponsiveContainer width="100%" height={compact ? 320 : 400}>
        <BarChart
          data={dailyData}
          margin={compact ? { top: 10, right: 10, left: 0, bottom: 40 } : { top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            stroke="#94a3b8"
            angle={-45}
            textAnchor="end"
            height={compact ? 60 : 80}
            tick={{ fill: "#94a3b8", fontSize: compact ? 10 : 12 }}
            tickFormatter={formatXAxis}
          />
          <YAxis
            stroke="#94a3b8"
            tick={{ fill: "#94a3b8", fontSize: compact ? 10 : 12 }}
            tickFormatter={formatYAxis}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: compact ? "10px" : "20px" }}
            iconType="rect"
            formatter={(value) => (
              <span className="text-slate-300" style={{ fontSize: compact ? '11px' : '14px' }}>
                {value}
              </span>
            )}
          />
          <Bar
            dataKey="buyAmount"
            name="Buy Amount"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="sellAmount"
            name="Sell Amount"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
