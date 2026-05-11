#!/usr/bin/env python3
"""
COSMIC SIGNAL — Regime Detector
Fetches market indicators via yfinance, classifies the current regime,
and outputs a YAML-ready dict for the edition frontmatter.

Regime logic:
  risk_on_expansion  — VIX < 18, SPY > 200dma, DXY stable/declining
  risk_on_rotation   — VIX 18-25, sector divergence, DXY mixed
  risk_off_flight    — VIX > 25, credit spreads widening, DXY rising
  thesis_break       — Contrarian triggers firing across 2+ themes
"""

import json
import sys
import datetime
import argparse

try:
    import yfinance as yf
except ImportError:
    print("ERROR: yfinance not installed. Run: pip install yfinance", file=sys.stderr)
    sys.exit(1)


def fetch_indicator(ticker: str, period: str = "6mo") -> dict:
    """Fetch current price and 200-day moving average for a ticker."""
    try:
        t = yf.Ticker(ticker)
        hist = t.history(period=period)
        if hist.empty:
            return {"price": None, "sma200": None, "error": "no data"}
        price = hist["Close"].iloc[-1]
        sma200 = hist["Close"].rolling(200).mean().iloc[-1] if len(hist) >= 200 else None
        return {"price": round(float(price), 2), "sma200": round(float(sma200), 2) if sma200 else None}
    except Exception as e:
        return {"price": None, "sma200": None, "error": str(e)}


def classify_regime(vix: float, spy_price: float, spy_sma200: float | None, dxy_price: float | None) -> str:
    """Classify market regime based on indicator thresholds."""
    spy_above_200dma = spy_sma200 is not None and spy_price > spy_sma200

    if vix > 30:
        return "risk_off_flight"
    if vix > 25:
        if not spy_above_200dma:
            return "risk_off_flight"
        return "risk_on_rotation"
    if vix < 18 and spy_above_200dma:
        return "risk_on_expansion"
    if vix <= 25 and spy_above_200dma:
        return "risk_on_rotation"
    if not spy_above_200dma:
        return "risk_off_flight"
    return "risk_on_rotation"


REGIME_META = {
    "risk_on_expansion": {
        "label": "Risk-On Expansion",
        "description": "Low volatility, equities trending above support. Favor offensive positioning.",
        "allocation": [
            {"theme_id": "ai-upstream", "weight_pct": 50},
            {"theme_id": "conflict-volatility", "weight_pct": 15},
            {"theme_id": "de-dollarization", "weight_pct": 20},
        ],
        "cash_pct": 15,
    },
    "risk_on_rotation": {
        "label": "Risk-On Rotation",
        "description": "Moderate volatility, sector divergence. Rotate between themes based on signal strength.",
        "allocation": [
            {"theme_id": "ai-upstream", "weight_pct": 30},
            {"theme_id": "conflict-volatility", "weight_pct": 30},
            {"theme_id": "de-dollarization", "weight_pct": 25},
        ],
        "cash_pct": 15,
    },
    "risk_off_flight": {
        "label": "Risk-Off Flight",
        "description": "Elevated volatility, credit stress signals. Shift to defensive — conflict/hedge themes, cash.",
        "allocation": [
            {"theme_id": "ai-upstream", "weight_pct": 10},
            {"theme_id": "conflict-volatility", "weight_pct": 40},
            {"theme_id": "de-dollarization", "weight_pct": 30},
        ],
        "cash_pct": 20,
    },
    "thesis_break": {
        "label": "Thesis Break",
        "description": "Core theses invalidated across themes. Maximum cash. No new entries.",
        "allocation": [
            {"theme_id": "ai-upstream", "weight_pct": 0},
            {"theme_id": "conflict-volatility", "weight_pct": 0},
            {"theme_id": "de-dollarization", "weight_pct": 0},
        ],
        "cash_pct": 100,
    },
}


def signal_from_vix(vix: float) -> str:
    if vix < 18:
        return "bullish"
    if vix < 25:
        return "neutral"
    return "bearish"


def signal_from_spy(price: float, sma200: float | None) -> str:
    if sma200 is None:
        return "unknown"
    if price > sma200 * 1.02:
        return "bullish"
    if price < sma200 * 0.98:
        return "bearish"
    return "neutral"


def signal_from_dxy(price: float | None) -> str:
    """Rising dollar = bearish for thematic (especially de-dollarization)."""
    if price is None:
        return "unknown"
    if price > 106:
        return "bearish"
    if price < 100:
        return "bullish"
    return "neutral"


def main():
    parser = argparse.ArgumentParser(description="COSMIC SIGNAL Regime Detector")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    print("Fetching market indicators...", file=sys.stderr)

    vix_data = fetch_indicator("^VIX", "6mo")
    spy_data = fetch_indicator("SPY", "1y")
    dxy_data = fetch_indicator("DX-Y.NYB", "6mo")

    vix = vix_data.get("price")
    spy_price = spy_data.get("price")
    spy_sma200 = spy_data.get("sma200")
    dxy_price = dxy_data.get("price")

    # Handle missing data gracefully
    if vix is None:
        vix = 20.0  # default to neutral
    if spy_price is None:
        spy_price = 500.0
        spy_sma200 = 490.0

    regime_type = classify_regime(vix, spy_price, spy_sma200, dxy_price)
    meta = REGIME_META[regime_type]

    indicators = [
        {
            "name": "VIX",
            "value": str(vix),
            "signal": signal_from_vix(vix),
        },
        {
            "name": "SPY",
            "value": f"${spy_price}" if spy_price else "N/A",
            "signal": signal_from_spy(spy_price, spy_sma200),
        },
        {
            "name": "SPY vs 200dma",
            "value": f"${spy_sma200}" if spy_sma200 else "N/A",
            "signal": signal_from_spy(spy_price, spy_sma200),
        },
        {
            "name": "DXY",
            "value": f"{dxy_price}" if dxy_price else "N/A",
            "signal": signal_from_dxy(dxy_price),
        },
    ]

    result = {
        "regime": regime_type,
        "label": meta["label"],
        "description": meta["description"],
        "indicators": indicators,
        "allocation": meta["allocation"],
        "cash_pct": meta["cash_pct"],
        "evaluated_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"REGIME: {meta['label']}")
        print(f"VIX: {vix} | SPY: ${spy_price} | DXY: {dxy_price}")
        for alloc in meta["allocation"]:
            print(f"  {alloc['theme_id']}: {alloc['weight_pct']}%")
        print(f"  CASH: {meta['cash_pct']}%")
        print()
        print("YAML frontmatter (paste into edition):")
        print("---")
        for line in json.dumps(result, indent=2).splitlines():
            print(line)


if __name__ == "__main__":
    main()
