#!/usr/bin/env python3
"""Fetch live prices and returns for a list of tickers.

Usage: python3 fetch-live-prices.py TICKER1 TICKER2 ...
Output: JSON to stdout with current price + period returns

Returns for each ticker:
  - price: current/last traded price
  - prev_close: previous market close
  - returns: { "24h": %, "1w": %, "1m": %, "1y": %, "5y": % }
  - name: company name
  - currency: trading currency
"""

import json
import sys
import os
from datetime import datetime, timedelta

try:
    import yfinance as yf
except ImportError:
    os.system(f"{sys.executable} -m pip install yfinance -q")
    import yfinance as yf


def compute_return(current: float, historical: float) -> float | None:
    if historical and historical > 0 and current and current > 0:
        return round(((current - historical) / historical) * 100, 2)
    return None


def fetch_ticker_prices(tickers: list[str]) -> dict:
    """Fetch current price and historical returns for multiple tickers."""
    if not tickers:
        return {}

    # Download 5y of daily data for all tickers at once
    end_date = datetime.now()
    start_date = end_date - timedelta(days=5 * 365 + 30)

    results = {}

    for ticker_str in tickers:
        try:
            ticker = yf.Ticker(ticker_str)
            info = ticker.info or {}
            hist = ticker.history(period="5y", interval="1d", auto_adjust=True)

            if hist.empty:
                results[ticker_str] = {"error": "no data", "price": None, "returns": {}}
                continue

            current_price = float(hist["Close"].iloc[-1])
            prev_close = float(hist["Close"].iloc[-2]) if len(hist) > 1 else current_price

            # Calculate returns at different lookbacks
            now = datetime.now()
            lookbacks = {
                "24h": 1,
                "1w": 7,
                "1m": 30,
                "1y": 365,
                "5y": 5 * 365,
            }

            returns = {}
            for label, days in lookbacks.items():
                target_date = now - timedelta(days=days)
                # Find the closest trading day on or before target_date
                mask = hist.index <= target_date.strftime("%Y-%m-%d")
                if mask.any():
                    historical_price = float(hist.loc[mask, "Close"].iloc[-1])
                    returns[label] = compute_return(current_price, historical_price)
                else:
                    returns[label] = None

            results[ticker_str] = {
                "price": round(current_price, 2),
                "prev_close": round(prev_close, 2),
                "name": info.get("shortName", ticker_str),
                "currency": info.get("currency", "USD"),
                "returns": returns,
            }

        except Exception as e:
            results[ticker_str] = {"error": str(e), "price": None, "returns": {}}

    return results


if __name__ == "__main__":
    tickers = [t.strip().upper() for t in sys.argv[1:] if t.strip()]
    if not tickers:
        print(json.dumps({"error": "no tickers provided"}))
        sys.exit(1)

    data = fetch_ticker_prices(tickers)
    print(json.dumps(data))
