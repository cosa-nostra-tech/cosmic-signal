#!/usr/bin/env python3
"""Fetch historical price data for all tickers and output chart-data.json.

Uses yfinance to pull 1Y of daily OHLCV data plus key statistics.
Output: data/chart-data.json with per-ticker history + stats.
"""

import json
import sys
import os

try:
    import yfinance as yf
except ImportError:
    print("Installing yfinance...")
    os.system(f"{sys.executable} -m pip install yfinance -q")
    import yfinance as yf

# All tickers across the 5 thematic armies
TICKERS = [
    "UUUU", "UEC", "SMR", "NNE",     # Nuclear Renaissance
    "MP", "MRVL", "VRT",              # Critical Mineral Sovereignty / AI Supply
    "BTU", "AMR",                      # Fossil Fuel Contrarian
    "CAT", "LHX", "KTOS", "TDG",      # Defense Industrial Base
    "GDXJ", "WPM", "SLV",             # Gold / Hard Money
]


def fetch_ticker_data(symbol: str) -> dict:
    """Fetch 1Y daily history + key stats for one ticker."""
    print(f"  Fetching {symbol}...", end=" ", flush=True)
    try:
        t = yf.Ticker(symbol)
        hist = t.history(period="1y", interval="1d")

        if hist.empty:
            print("NO DATA")
            return {"symbol": symbol, "error": "no_data"}

        # Build price series: [{date, close, open, high, low, volume}]
        prices = []
        for idx, row in hist.iterrows():
            prices.append({
                "date": idx.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })

        # Key stats from info
        info = t.info or {}
        stats = {
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
            "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
            "dividend_yield": info.get("dividendYield"),
            "quarterly_dividend": info.get("dividendRate"),
            "avg_volume": info.get("averageVolume"),
            "beta": info.get("beta"),
            "eps": info.get("trailingEps"),
            "revenue_growth": info.get("revenueGrowth"),
        }

        # Latest data point
        latest = prices[-1]
        prev_close = prices[-2]["close"] if len(prices) > 1 else latest["close"]
        change = round(latest["close"] - prev_close, 2)
        change_pct = round((change / prev_close) * 100, 2) if prev_close else 0

        print(f"OK ({len(prices)} days)")
        return {
            "symbol": symbol,
            "name": info.get("shortName", symbol),
            "exchange": info.get("exchange", ""),
            "currency": info.get("currency", "USD"),
            "latest": {
                "price": latest["close"],
                "change": change,
                "change_pct": change_pct,
                "open": latest["open"],
                "high": latest["high"],
                "low": latest["low"],
                "volume": latest["volume"],
                "prev_close": prev_close,
            },
            "stats": stats,
            "prices": prices,
        }
    except Exception as e:
        print(f"ERROR: {e}")
        return {"symbol": symbol, "error": str(e)}


def main():
    out_path = os.path.join(os.path.dirname(__file__), "..", "data", "chart-data.json")
    out_path = os.path.abspath(out_path)

    print(f"Fetching chart data for {len(TICKERS)} tickers...")
    result = {}
    for symbol in TICKERS:
        data = fetch_ticker_data(symbol)
        result[symbol] = data

    # Write output
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(result, f)

    ok = sum(1 for v in result.values() if "error" not in v)
    print(f"\nDone: {ok}/{len(TICKERS)} tickers fetched → {out_path}")


if __name__ == "__main__":
    main()
