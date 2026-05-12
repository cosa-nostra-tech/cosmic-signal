"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Header } from "@/components/layout/Header";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";

// ── Types ────────────────────────────────────────────────────

interface Holding {
  id: string;
  ticker: string;
  vehicle_type: string;
  shares: number;
  avg_cost: number | null;
  source: string;
  source_thematic_id: string | null;
}

interface PriceData {
  price: number | null;
  prev_close: number | null;
  name: string;
  currency: string;
  returns: Record<string, number | null>;
  error?: string;
}

interface ThematicInfo {
  id: string;
  title: string;
}

type Period = "24h" | "1w" | "1m" | "1y" | "5y";

const PERIODS: { key: Period; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "1w", label: "1W" },
  { key: "1m", label: "1M" },
  { key: "1y", label: "1Y" },
  { key: "5y", label: "5Y" },
];

// ── Main component ───────────────────────────────────────────

export default function DashboardPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [thematics, setThematics] = useState<Record<string, ThematicInfo>>({});
  const [period, setPeriod] = useState<Period>("1m");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTicker, setAddTicker] = useState("");
  const [addShares, setAddShares] = useState("");
  const [addAvgCost, setAddAvgCost] = useState("");
  const [adding, setAdding] = useState(false);

  // Fetch holdings
  const fetchHoldings = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio");
      if (res.ok) {
        const data = await res.json();
        setHoldings(data.holdings || []);
      }
    } catch (e) {
      console.error("Failed to fetch holdings:", e);
    }
  }, []);

  // Fetch thematics for tags
  const fetchThematics = useCallback(async () => {
    try {
      const supabaseModule = await import("@/lib/supabase/client");
      const supabase = supabaseModule.createClient();
      const { data } = await supabase.from("thematics").select("id, title");
      const map: Record<string, ThematicInfo> = {};
      for (const t of data || []) {
        map[t.id] = { id: t.id, title: t.title };
      }
      setThematics(map);
    } catch {
      // Non-critical
    }
  }, []);

  // Fetch live prices for all held tickers
  const fetchPrices = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) {
      setPrices({});
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/market/prices?tickers=${tickers.join(",")}`);
      if (res.ok) {
        const data = await res.json();
        setPrices(data);
      }
    } catch (e) {
      console.error("Failed to fetch prices:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Also fetch positions from thematics (to show thematic tags on positions)
  const [thematicPositions, setThematicPositions] = useState<Record<string, string[]>>({});

  const fetchThematicPositions = useCallback(async () => {
    try {
      const supabaseModule = await import("@/lib/supabase/client");
      const supabase = supabaseModule.createClient();
      const { data: thematicsData } = await supabase
        .from("thematics")
        .select("id, title")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

      if (!thematicsData) return;

      const map: Record<string, string[]> = {};
      for (const th of thematicsData) {
        const { data: positions } = await supabase
          .from("positions")
          .select("ticker")
          .eq("thematic_id", th.id);
        for (const pos of positions || []) {
          if (!map[pos.ticker]) map[pos.ticker] = [];
          map[pos.ticker].push(th.id);
        }
      }
      setThematicPositions(map);
    } catch {
      // Non-critical
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchHoldings(), fetchThematics(), fetchThematicPositions()]);
    };
    init();
  }, [fetchHoldings, fetchThematics, fetchThematicPositions]);

  // Fetch prices when holdings change
  useEffect(() => {
    if (holdings.length > 0) {
      const tickers = holdings.map((h) => h.ticker);
      fetchPrices(tickers);
    }
  }, [holdings, fetchPrices]);

  // Auto-refresh prices every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      if (holdings.length > 0) {
        fetchPrices(holdings.map((h) => h.ticker));
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [holdings, fetchPrices]);

  // Add stock handler
  async function handleAddStock() {
    if (!addTicker.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: addTicker.trim().toUpperCase(),
          vehicleType: "equity",
          shares: addShares ? parseFloat(addShares) : undefined,
          avgCost: addAvgCost ? parseFloat(addAvgCost) : undefined,
          source: "direct",
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setAddTicker("");
        setAddShares("");
        setAddAvgCost("");
        await fetchHoldings();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add stock");
      }
    } catch {
      alert("Connection error. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  // Remove stock handler
  async function handleRemoveStock(id: string) {
    try {
      const res = await fetch(`/api/portfolio?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setHoldings((prev) => prev.filter((h) => h.id !== id));
      }
    } catch {
      // Silently fail
    }
  }

  // Add all positions from a thematic to portfolio
  async function handleAddFromThematic(thematicId: string) {
    try {
      const supabaseModule = await import("@/lib/supabase/client");
      const supabase = supabaseModule.createClient();
      const { data: positions } = await supabase
        .from("positions")
        .select("ticker, vehicle_type")
        .eq("thematic_id", thematicId);

      if (!positions || positions.length === 0) {
        alert("No positions in this thematic");
        return;
      }

      for (const pos of positions) {
        await fetch("/api/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker: pos.ticker,
            vehicleType: pos.vehicle_type,
            source: "thematic",
            sourceThematicId: thematicId,
          }),
        });
      }

      await fetchHoldings();
    } catch {
      alert("Failed to import positions");
    }
  }

  // Compute portfolio value
  const totalValue = holdings.reduce((sum, h) => {
    const p = prices[h.ticker]?.price;
    return sum + (p ? p * (h.shares || 0) : 0);
  }, 0);

  const totalCost = holdings.reduce((sum, h) => {
    return sum + (h.avg_cost ? h.avg_cost * (h.shares || 0) : 0);
  }, 0);

  const totalPnl = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  return (
    <>
      <Header />
      <Container className="py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Track your positions across all thematics
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowAddModal(true)}>
              + Add stock
            </Button>
          </div>
        </div>

        {/* Portfolio summary */}
        {holdings.length > 0 && (
          <div className="flex items-baseline gap-6 mb-8">
            <div>
              <div className="text-3xl font-semibold tabular-nums">
                ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-neutral-400 uppercase tracking-wider mt-1">
                Portfolio value
              </div>
            </div>
            {totalCost > 0 && (
              <div>
                <div className={`text-lg font-semibold tabular-nums ${totalPnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}%
                </div>
                <div className="text-xs text-neutral-400 uppercase tracking-wider mt-1">
                  Total P&L
                </div>
              </div>
            )}
            <div>
              <div className="text-lg font-semibold">{holdings.length}</div>
              <div className="text-xs text-neutral-400 uppercase tracking-wider mt-1">
                Holdings
              </div>
            </div>
          </div>
        )}

        {/* Period selector */}
        {holdings.length > 0 && (
          <div className="flex gap-1 mb-4">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  period === p.key
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Holdings table */}
        {loading ? (
          <div className="text-sm text-neutral-400 py-8">Loading portfolio…</div>
        ) : holdings.length > 0 ? (
          <div className="border border-neutral-200 rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[100px_1fr_80px_100px_80px_40px] gap-2 px-5 py-3 bg-neutral-50 border-b border-neutral-200 text-xs font-medium text-neutral-400 uppercase tracking-wider">
              <div>Ticker</div>
              <div>Thematics</div>
              <div className="text-right">Price</div>
              <div className="text-right">{period} %</div>
              <div className="text-right">Value</div>
              <div></div>
            </div>

            {/* Rows */}
            {holdings.map((holding) => {
              const priceData = prices[holding.ticker];
              const price = priceData?.price;
              const returnVal = priceData?.returns?.[period];
              const name = priceData?.name || holding.ticker;
              const hasError = priceData?.error || !price;
              const value = price ? price * (holding.shares || 0) : 0;
              const thematicIds = thematicPositions[holding.ticker] || [];

              return (
                <div
                  key={holding.id}
                  className="grid grid-cols-[100px_1fr_80px_100px_80px_40px] gap-2 px-5 py-3 border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/50 transition-colors items-center"
                >
                  {/* Ticker */}
                  <div>
                    <div className="text-sm font-semibold font-mono">{holding.ticker}</div>
                    <div className="text-xs text-neutral-400 truncate">{name}</div>
                  </div>

                  {/* Thematic tags */}
                  <div className="flex flex-wrap gap-1">
                    {/* From direct holdings */}
                    {holding.source === "thematic" && holding.source_thematic_id && thematics[holding.source_thematic_id] && (
                      <Link
                        href={`/thematic/${holding.source_thematic_id}`}
                        className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                      >
                        {thematics[holding.source_thematic_id].title}
                      </Link>
                    )}
                    {/* From other thematics that have this ticker */}
                    {thematicIds
                      .filter((tid) => tid !== holding.source_thematic_id)
                      .map((tid) =>
                        thematics[tid] ? (
                          <Link
                            key={tid}
                            href={`/thematic/${tid}`}
                            className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          >
                            {thematics[tid].title}
                          </Link>
                        ) : null
                      )}
                    {holding.source === "direct" && thematicIds.length === 0 && (
                      <span className="text-xs text-neutral-300 italic">direct</span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    {hasError ? (
                      <span className="text-xs text-neutral-300">—</span>
                    ) : (
                      <span className="text-sm font-medium tabular-nums">
                        ${price?.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Return */}
                  <div className="text-right">
                    {returnVal !== null && returnVal !== undefined ? (
                      <span
                        className={`text-sm font-medium tabular-nums ${
                          returnVal >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {returnVal >= 0 ? "+" : ""}{returnVal.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-300">—</span>
                    )}
                  </div>

                  {/* Value */}
                  <div className="text-right text-sm tabular-nums">
                    {value > 0
                      ? `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                      : "—"}
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => handleRemoveStock(holding.id)}
                    className="text-neutral-300 hover:text-red-500 transition-colors"
                    aria-label={`Remove ${holding.ticker}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-12 text-center">
            <p className="text-neutral-500 mb-6">
              Your portfolio is empty. Add stocks directly or import from your thematics.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => setShowAddModal(true)}>+ Add stock</Button>
              <ImportFromThematicButton onImport={handleAddFromThematic} />
            </div>
          </div>
        )}

        {/* Thematics section — import positions */}
        {holdings.length > 0 && (
          <div className="mt-12">
            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">
              Import from thematics
            </h2>
            <ImportFromThematicButton onImport={handleAddFromThematic} />
          </div>
        )}
      </Container>

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Add stock</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5 block">
                  Ticker symbol
                </label>
                <input
                  type="text"
                  value={addTicker}
                  onChange={(e) => setAddTicker(e.target.value.toUpperCase())}
                  placeholder="e.g. AAPL"
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm font-mono placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5 block">
                    Shares
                  </label>
                  <input
                    type="number"
                    value={addShares}
                    onChange={(e) => setAddShares(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm tabular-nums placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5 block">
                    Avg cost
                  </label>
                  <input
                    type="number"
                    value={addAvgCost}
                    onChange={(e) => setAddAvgCost(e.target.value)}
                    placeholder="$0.00"
                    className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm tabular-nums placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  />
                </div>
              </div>

              <Button
                onClick={handleAddStock}
                disabled={!addTicker.trim() || adding}
                className="w-full"
              >
                {adding ? "Adding…" : "Add to portfolio"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Import from Thematic Button ─────────────────────────────

function ImportFromThematicButton({ onImport }: { onImport: (id: string) => Promise<void> }) {
  const [showPicker, setShowPicker] = useState(false);
  const [thematicsList, setThematicsList] = useState<{ id: string; title: string }[]>([]);
  const [importing, setImporting] = useState(false);

  async function fetchThematics() {
    try {
      const supabaseModule = await import("@/lib/supabase/client");
      const supabase = supabaseModule.createClient();
      const { data } = await supabase.from("thematics").select("id, title");
      setThematicsList(data || []);
      setShowPicker(true);
    } catch {
      // Silently fail
    }
  }

  async function handleImport(id: string) {
    setImporting(true);
    await onImport(id);
    setImporting(false);
    setShowPicker(false);
  }

  return (
    <div className="relative">
      <Button variant="secondary" onClick={fetchThematics}>
        Import from thematic
      </Button>

      {showPicker && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-neutral-200 rounded-xl shadow-lg z-10 py-2 max-h-64 overflow-y-auto">
          {thematicsList.length === 0 ? (
            <div className="px-4 py-3 text-sm text-neutral-400">No thematics yet</div>
          ) : (
            thematicsList.map((th) => (
              <button
                key={th.id}
                onClick={() => handleImport(th.id)}
                disabled={importing}
                className="w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                {th.title}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
