import matter from "gray-matter";
import { promises as fs } from "fs";
import path from "path";

const EDITIONS_DIR = path.join(process.cwd(), "data", "editions");

export interface Source {
  title: string;
  url: string;
  date: string;
}

export interface Chokepoint {
  name: string;
  severity: "critical" | "high" | "rising" | "watch";
  detail: string;
  sources: Source[];
}

export interface TickerSuggestion {
  symbol: string;
  name: string;
  category: string;
  thesis: string;
  contrarian: string;
  buy_price: string;
  target_price: string;
  potential_return: string;
  current_price: number;
  market_cap_b: number;
  risk_level: "low" | "medium" | "high" | "very_high";
  trade_rules?: TradeRules;
}

// ─── COMPOSER-INSPIRED: SYMPHONY TYPES ───

/** A single condition node in a symphony decision tree */
export interface SymphonyCondition {
  /** Human-readable condition, e.g. "Uranium spot > $85/lb" */
  if: string;
  /** Action to take when condition is true */
  then: string;
  /** Current evaluation status: met, not_met, unknown (data not yet available) */
  status: "met" | "not_met" | "unknown";
  /** Current value of the indicator being checked, e.g. "$78/lb" */
  current_value?: string;
  /** Ticker symbols affected by this branch */
  affects?: string[];
}

/** A complete symphony (executable strategy) for one theme */
export interface Symphony {
  /** Symphony name, e.g. "AI SUPPLY CHAIN OF GOD" */
  name: string;
  /** Current running state */
  status: "running" | "paused" | "halted";
  /** Status reason, e.g. "VIX > 30 — risk-off protocol active" */
  status_reason?: string;
  /** Ordered conditional logic tree — first matching condition wins */
  conditions: SymphonyCondition[];
  /** Default action when no condition matches (ELSE branch) */
  default_action: string;
  /** Next scheduled evaluation */
  next_check: string;
}

/** Market regime classification */
export type RegimeType =
  | "risk_on_expansion"
  | "risk_on_rotation"
  | "risk_off_flight"
  | "thesis_break";

export interface RegimeIndicator {
  /** Indicator name, e.g. "VIX" */
  name: string;
  /** Current value */
  value: string;
  /** What this value means for the regime */
  signal: "bullish" | "neutral" | "bearish";
}

export interface RegimeAllocation {
  theme_id: string;
  weight_pct: number;
}

export interface MarketRegime {
  /** Current regime classification */
  regime: RegimeType;
  /** Human-readable label, e.g. "Risk-On Expansion" */
  label: string;
  /** Short description of current conditions */
  description: string;
  /** Individual indicator readings that drove the classification */
  indicators: RegimeIndicator[];
  /** Target allocation across themes for this regime */
  allocation: RegimeAllocation[];
  /** Cash reserve percentage */
  cash_pct: number;
  /** Timestamp of last regime evaluation */
  evaluated_at: string;
}

/** Cross-theme correlation signal */
export interface CrossThemeSignal {
  /** What connects the themes */
  connector: string;
  /** Which themes are linked */
  themes: string[];
  /** Direction: reinforcing (themes agree) or contradictory (themes conflict) */
  direction: "reinforcing" | "contradictory";
  /** Strength 1-5 */
  strength: number;
  /** What this means for positioning */
  implication: string;
  /** Tickers at the intersection */
  tickers?: string[];
}

// ─── 5-ARMY FRAMEWORK ───

export interface ArmyTicker {
  symbol: string;
  name: string;
  vehicle: "stock" | "leaps" | "etf";
  leverage: number; /** 1 for stock, 2-3 for LEAPS */
  stop_pct: number; /** negative, e.g. -40 */
  thesis: string;
  catalyst: string;
  potential_return: string; /** e.g. "5-10x" */
}

export interface Army {
  id: string;
  name: string;
  tag_class: string;
  color: string;
  allocation_pct: number;
  tickers: ArmyTicker[];
  meta_thesis: string;
  status: "deploying" | "engaged" | "rotating" | "retreated";
}

// ─── NEWS FEED (per theme, populated by daily cron) ───

export type NewsSource = "mainstream" | "alternative" | "social" | "official" | "research";

export interface NewsItem {
  /** Headline */
  headline: string;
  /** 1-2 sentence summary / editorial take */
  summary: string;
  /** Source category */
  source_type: NewsSource;
  /** Publication or platform name, e.g. "Reuters", "r/investing", "Bloomberg" */
  source_name: string;
  /** Original URL */
  url?: string;
  /** ISO date string */
  date: string;
  /** Relevance to specific tickers in this theme */
  tickers?: string[];
  /** Signal strength: how much this moves the thesis */
  signal: "strong" | "moderate" | "weak" | "noise";
  /** Sentiment relative to theme thesis */
  sentiment: "bullish" | "neutral" | "bearish" | "contrarian";
}

// ─── EXTENDED THEME DATA ───

export interface ThemeData {
  id: string;
  name: string;
  tag_class: string;
  color: string;
  summary: string;
  chokepoints: Chokepoint[];
  signals: { text: string; sources: Source[] }[];
  contrarian: { text: string; sources: Source[] }[];
  tickers: TickerSuggestion[];
  /** Composer-inspired: executable strategy for this theme */
  symphony?: Symphony;
  /** 5-Army: which army this theme belongs to (if mapped) */
  army_id?: string;
  /** Daily news feed — populated by cron */
  news?: NewsItem[];
}

// ─── TRADE RULES (per ticker) ───

export interface TradeRules {
  entry_trigger: string;
  max_position_pct: number;
  hold_period: string;
  exit_signal: string;
}

// ─── EDITION DATA ───

export interface EditionData {
  edition: string;
  date: string;
  status: string;
  themes: ThemeData[];
  /** Composer-inspired: current market regime & allocation */
  regime?: MarketRegime;
  /** Composer-inspired: cross-theme signal correlations */
  cross_theme_signals?: CrossThemeSignal[];
  trading_rules?: {
    max_trades_per_month: number;
    max_open_positions: number;
    max_portfolio_risk_pct: number;
    conviction_levels: { level: number; label: string; position_pct: number | string; action: string }[];
    timing_rules: { rule: string; detail: string }[];
    exit_rules: { rule: string; detail: string }[];
    risk_rules: { rule: string; detail: string }[];
  };
  /** 5-Army framework: concentrated thematic armies */
  armies?: Army[];
  /** Portfolio target and tracking */
  portfolio_target?: {
    start: number;
    target: number;
    horizon_months: number;
    current_value?: number;
  };
}

// ─── DATA ACCESS ───

export async function getLatestEdition(): Promise<EditionData | null> {
  try {
    const files = await fs.readdir(EDITIONS_DIR);
    const mdFiles = files.filter((f) => f.endsWith(".md")).sort().reverse();
    if (mdFiles.length === 0) return null;

    const latestFile = mdFiles[0];
    const content = await fs.readFile(path.join(EDITIONS_DIR, latestFile), "utf-8");
    const { data } = matter(content);
    return data as EditionData;
  } catch {
    return null;
  }
}

export async function getAllEditions(): Promise<{ slug: string; date: string; edition: string }[]> {
  try {
    const files = await fs.readdir(EDITIONS_DIR);
    const mdFiles = files.filter((f) => f.endsWith(".md")).sort().reverse();
    
    const editions = [];
    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(EDITIONS_DIR, file), "utf-8");
      const { data } = matter(content);
      editions.push({
        slug: file.replace(".md", ""),
        date: data.date,
        edition: data.edition,
      });
    }
    return editions;
  } catch {
    return [];
  }
}
