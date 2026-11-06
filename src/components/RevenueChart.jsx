import { useState } from "react";
import { formatPrice } from "../utils";

const MONTH_NAMES = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
];

const MONTH_SHORT = [
  "Yan", "Fev", "Mar", "Apr", "May", "Iyun",
  "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"
];

function formatShortSom(n) {
  if (!n || n <= 0) return "0";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} mlrd`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mln`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} ming`;
  return `${n}`;
}

export default function RevenueChart({ reportData, series = [] }) {
  const [chartMode, setChartMode] = useState("all"); // "all" | "revenue" | "expense" | "profit"
  const [activeBar, setActiveBar] = useState(null);
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();

  // 12 oylik ma'lumotlar strukturasini tayyorlaymiz
  const monthlyData = MONTH_NAMES.map((name, idx) => {
    const monthKey = `${currentYear}-${String(idx + 1).padStart(2, "0")}`;
    const found = series.find((s) => s.period === monthKey);
    const rev = found ? (found.revenue || found.netRevenue || 0) : 0;
    const exp = found ? (found.expenses || 0) : 0;
    const cogs = found ? (found.cogs || 0) : 0;
    const profit = found ? (found.netProfit || (rev - cogs - exp)) : 0;

    return {
      monthKey,
      name,
      shortName: MONTH_SHORT[idx],
      isCurrentMonth: idx === currentMonthIdx,
      revenue: rev,
      expenses: exp,
      cogs,
      profit,
      orders: found ? (found.deliveredOrders || 0) : 0,
    };
  });

  // Maksimal qiymatni hisoblash
  const maxRevenue = Math.max(...monthlyData.map((m) => m.revenue), 1_000_000);
  const maxExpense = Math.max(...monthlyData.map((m) => m.expenses), 1_000_000);
  const maxProfit = Math.max(...monthlyData.map((m) => Math.max(0, m.profit)), 1_000_000);

  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);
  const totalProfit = monthlyData.reduce((sum, m) => sum + m.profit, 0);
  const totalOrders = monthlyData.reduce((sum, m) => sum + m.orders, 0);

  const getMetric = (m) => {
    if (chartMode === "revenue") return { val: m.revenue, max: maxRevenue, color: "from-indigo-600 to-blue-500", label: "Tushum" };
    if (chartMode === "expense") return { val: m.expenses, max: maxExpense, color: "from-amber-500 to-rose-500", label: "Xarajat" };
    if (chartMode === "profit") return { val: Math.max(0, m.profit), max: maxProfit, color: "from-emerald-600 to-teal-500", label: "Sof Daromad" };
    // "all"
    return { val: m.revenue, max: maxRevenue, color: "from-indigo-600 to-blue-500", label: "Tushum" };
  };

  const currentScaleMax = chartMode === "expense" ? maxExpense : chartMode === "profit" ? maxProfit : maxRevenue;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
      {/* Header and Filter Tabs */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>📈</span> Moliyaviy Statistik Grafiklar
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentYear}-yil oylik savdo, xarajatlar va sof daromad dinamikasi
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setChartMode("all")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              chartMode === "all" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Barchasi
          </button>
          <button
            type="button"
            onClick={() => setChartMode("revenue")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              chartMode === "revenue" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Savdo grafigi
          </button>
          <button
            type="button"
            onClick={() => setChartMode("expense")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              chartMode === "expense" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Xarajatlar grafigi
          </button>
          <button
            type="button"
            onClick={() => setChartMode("profit")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              chartMode === "profit" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sof daromad grafigi
          </button>
        </div>
      </div>

      {/* SVG / Bar Chart Container */}
      <div className="relative pt-6 pb-2">
        {/* Horizontal Guide Lines */}
        <div className="absolute inset-x-0 top-6 bottom-10 flex flex-col justify-between pointer-events-none opacity-40">
          <div className="border-b border-dashed border-slate-200 flex justify-end text-[10px] text-slate-400 pr-1">
            {formatShortSom(currentScaleMax)}
          </div>
          <div className="border-b border-dashed border-slate-200 flex justify-end text-[10px] text-slate-400 pr-1">
            {formatShortSom(currentScaleMax * 0.66)}
          </div>
          <div className="border-b border-dashed border-slate-200 flex justify-end text-[10px] text-slate-400 pr-1">
            {formatShortSom(currentScaleMax * 0.33)}
          </div>
          <div className="border-b border-dashed border-slate-200 flex justify-end text-[10px] text-slate-400 pr-1">
            0 so'm
          </div>
        </div>

        {/* Bars Grid */}
        <div className="relative z-10 grid grid-cols-12 gap-1 sm:gap-2 h-60 sm:h-64 items-end px-2">
          {monthlyData.map((m, idx) => {
            const metric = getMetric(m);
            const heightPercent = metric.val > 0 ? Math.max((metric.val / metric.max) * 100, 6) : 0;
            const isSelected = activeBar === idx;

            return (
              <div
                key={m.monthKey}
                className="group relative flex flex-col items-center h-full justify-end cursor-pointer"
                onMouseEnter={() => setActiveBar(idx)}
                onMouseLeave={() => setActiveBar(null)}
                onClick={() => setActiveBar(isSelected ? null : idx)}
              >
                {/* Tooltip on hover */}
                {isSelected && (
                  <div className="absolute -top-24 z-30 min-w-[150px] sm:min-w-[170px] -translate-x-1/2 left-1/2 rounded-2xl bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 text-white shadow-2xl text-left pointer-events-none transition-all border border-slate-700">
                    <p className="text-[11px] font-bold text-indigo-300 text-center">{m.name} {currentYear}</p>
                    <div className="mt-1 space-y-0.5 text-[11px]">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">Tushum:</span>
                        <span className="font-bold text-white">{formatPrice(m.revenue)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">Tannarx:</span>
                        <span className="font-bold text-slate-300">{formatPrice(m.cogs)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">Xarajat:</span>
                        <span className="font-bold text-rose-300">{formatPrice(m.expenses)}</span>
                      </div>
                      <div className="flex justify-between gap-2 border-t border-slate-700 pt-1 font-bold">
                        <span className="text-emerald-400">Sof foyda:</span>
                        <span className="text-emerald-300">{formatPrice(m.profit)}</span>
                      </div>
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-slate-900"></div>
                  </div>
                )}

                {/* Amount label above bar */}
                {metric.val > 0 && (
                  <span className="mb-1 hidden sm:block text-[9px] font-bold text-slate-500 truncate max-w-full">
                    {formatShortSom(metric.val)}
                  </span>
                )}

                {/* The Bar */}
                <div className="w-full max-w-[34px] bg-slate-100/70 rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-xl transition-all duration-500 ease-out bg-gradient-to-t ${metric.color} ${
                      isSelected ? "ring-2 ring-indigo-400 ring-offset-2" : ""
                    }`}
                  />
                </div>

                {/* Month label */}
                <div className="mt-2 text-center">
                  <span
                    className={`text-[11px] font-semibold block transition-colors ${
                      m.isCurrentMonth
                        ? "text-indigo-600 font-extrabold"
                        : "text-slate-500 group-hover:text-slate-900"
                    }`}
                  >
                    <span className="hidden sm:inline">{m.name.slice(0, 3)}</span>
                    <span className="sm:hidden">{m.shortName.slice(0, 1)}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center sm:text-left">
        <div className="rounded-xl bg-indigo-50/70 p-3">
          <p className="text-[11px] font-medium text-indigo-700">Yillik Jami Tushum</p>
          <p className="text-sm sm:text-base font-extrabold text-indigo-950 mt-0.5">
            {formatPrice(totalRevenue)}
          </p>
        </div>
        <div className="rounded-xl bg-amber-50/70 p-3">
          <p className="text-[11px] font-medium text-amber-800">Yillik Xarajatlar</p>
          <p className="text-sm sm:text-base font-extrabold text-amber-900 mt-0.5">
            {formatPrice(totalExpenses)}
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50/70 p-3">
          <p className="text-[11px] font-medium text-emerald-700">Yillik Sof Foyda</p>
          <p className="text-sm sm:text-base font-extrabold text-emerald-800 mt-0.5">
            {formatPrice(totalProfit)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[11px] font-medium text-slate-500">Tugallangan Buyurtmalar</p>
          <p className="text-sm sm:text-base font-extrabold text-slate-800 mt-0.5">
            {totalOrders} ta
          </p>
        </div>
      </div>
    </div>
  );
}
