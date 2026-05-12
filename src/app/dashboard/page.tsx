import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Header } from "@/components/layout/Header";
import { Pill } from "@/components/ui/Pill";
import Link from "next/link";

interface Thematic {
  id: string;
  title: string;
  thesis_statement: string;
  status: string;
  confidence: string;
}

interface PositionRow {
  id: string;
  ticker: string;
  vehicle_type: string;
  vehicle_name: string | null;
  allocation_pct: number | null;
  entry_rationale: string | null;
  thematic_id: string;
  thematics: { title: string } | { title: string }[];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Check onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_complete) redirect("/onboarding");

  // Fetch thematics
  const { data: thematics } = await supabase
    .from("thematics")
    .select("id, title, thesis_statement, status, confidence")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  // Fetch all positions with their thematic titles
  const { data: positions } = await supabase
    .from("positions")
    .select("id, ticker, vehicle_type, vehicle_name, allocation_pct, entry_rationale, thematic_id, thematics!inner(title)")
    .eq("thematics.user_id", user.id)
    .order("ticker");

  // Aggregate positions by ticker
  const tickerMap = new Map<string, {
    ticker: string;
    thematics: { id: string; title: string }[];
    vehicles: Set<string>;
    totalAllocation: number;
    rationale: string | null;
  }>();

  for (const pos of (positions || []) as PositionRow[]) {
    const thematicTitle = Array.isArray(pos.thematics) ? pos.thematics[0]?.title : pos.thematics?.title || "Unknown";
    const existing = tickerMap.get(pos.ticker);
    if (existing) {
      existing.thematics.push({ id: pos.thematic_id, title: thematicTitle });
      existing.vehicles.add(pos.vehicle_type);
      existing.totalAllocation += pos.allocation_pct || 0;
    } else {
      tickerMap.set(pos.ticker, {
        ticker: pos.ticker,
        thematics: [{ id: pos.thematic_id, title: thematicTitle }],
        vehicles: new Set([pos.vehicle_type]),
        totalAllocation: pos.allocation_pct || 0,
        rationale: pos.entry_rationale,
      });
    }
  }

  const aggregatedTickers = Array.from(tickerMap.values()).sort(
    (a, b) => b.totalAllocation - a.totalAllocation
  );

  // Stats
  const activeThematics = (thematics || []).filter((t: Thematic) => t.status === "active").length;
  const totalTickers = aggregatedTickers.length;
  const totalAllocation = aggregatedTickers.reduce((s, t) => s + t.totalAllocation, 0);

  const statusToHealth = (status: string) => {
    switch (status) {
      case "active": return "stable";
      case "paused": return "under_pressure";
      case "broken": return "breaking";
      default: return "stable";
    }
  };

  const healthStyles: Record<string, string> = {
    stable: "bg-neutral-50 text-neutral-700 border-neutral-200",
    under_pressure: "bg-amber-50 text-amber-700 border-amber-200",
    breaking: "bg-red-50 text-red-700 border-red-200",
    strengthening: "bg-green-50 text-green-700 border-green-200",
  };

  const healthLabels: Record<string, string> = {
    stable: "● Stable",
    under_pressure: "↓ Under Pressure",
    breaking: "⚠ Breaking",
    strengthening: "↑ Strengthening",
  };

  return (
    <>
      <Header />
      <Container className="py-16">
        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-10">
          <div>
            <div className="text-2xl font-semibold">{activeThematics}</div>
            <div className="text-xs text-neutral-400 uppercase tracking-wider">Active thematics</div>
          </div>
          <div className="w-px h-10 bg-neutral-200" />
          <div>
            <div className="text-2xl font-semibold">{totalTickers}</div>
            <div className="text-xs text-neutral-400 uppercase tracking-wider">Unique positions</div>
          </div>
          <div className="w-px h-10 bg-neutral-200" />
          <div>
            <div className="text-2xl font-semibold">{totalAllocation.toFixed(0)}%</div>
            <div className="text-xs text-neutral-400 uppercase tracking-wider">Total allocation</div>
          </div>
        </div>

        {/* Portfolio positions */}
        <section className="mb-12">
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">
            Portfolio positions
          </h2>
          {aggregatedTickers.length > 0 ? (
            <div className="border border-neutral-200 rounded-2xl divide-y divide-neutral-100">
              {aggregatedTickers.map((ticker) => (
                <div
                  key={ticker.ticker}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-neutral-50 transition-colors"
                >
                  {/* Ticker */}
                  <span className="text-sm font-semibold font-mono w-20 shrink-0">
                    {ticker.ticker}
                  </span>

                  {/* Thematic tags */}
                  <div className="flex-1 flex flex-wrap gap-1.5">
                    {ticker.thematics.map((th, i) => (
                      <Link
                        key={i}
                        href={`/thematic/${th.id}`}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                      >
                        {th.title}
                      </Link>
                    ))}
                  </div>

                  {/* Vehicles */}
                  <div className="hidden sm:flex gap-1.5 shrink-0">
                    {Array.from(ticker.vehicles).map((v) => (
                      <Pill key={v} variant="dashed">{v}</Pill>
                    ))}
                  </div>

                  {/* Allocation */}
                  <span className="text-sm font-medium text-neutral-900 tabular-nums w-16 text-right shrink-0">
                    {ticker.totalAllocation > 0 ? `${ticker.totalAllocation}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-8 text-center">
              <p className="text-sm text-neutral-500 mb-4">
                No positions yet. Create a thematic to get started.
              </p>
              <Link
                href="/thematic/new/research"
                className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-full bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
              >
                Start researching
              </Link>
            </div>
          )}
        </section>

        {/* Thematics overview */}
        <section>
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">
            Thematics
          </h2>
          {(thematics || []).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(thematics as Thematic[]).map((thematic) => {
                const health = statusToHealth(thematic.status);
                return (
                  <Link
                    key={thematic.id}
                    href={`/thematic/${thematic.id}`}
                    className="bg-white border border-neutral-200 rounded-2xl p-5 hover:border-neutral-300 transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${
                          healthStyles[health] || healthStyles.stable
                        }`}
                      >
                        {healthLabels[health] || healthLabels.stable}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {thematic.confidence.charAt(0).toUpperCase() + thematic.confidence.slice(1)}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold mb-1 group-hover:text-neutral-600 transition-colors">
                      {thematic.title}
                    </h3>
                    <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">
                      {thematic.thesis_statement}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-8 text-center">
              <p className="text-sm text-neutral-500">
                No thematics yet.
              </p>
            </div>
          )}
        </section>
      </Container>
    </>
  );
}
