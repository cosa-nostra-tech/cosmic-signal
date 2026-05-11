#!/usr/bin/env python3
"""
COSMIC SIGNAL — Backtest V2
More realistic: uses dynamic buy zones based on prices at inauguration,
and compares strict rules vs. simple buy-and-hold of the same basket.
"""

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import sys

START_DATE = "2025-01-20"
END_DATE = "2026-05-09"
STARTING_CAPITAL = 5000.0

# Scale-in weights
SCALE_IN = [0.40, 0.30, 0.30]
SLIPPAGE = 0.002  # 0.2% per trade
MIN_CASH_PCT = 20
MAX_POSITIONS = 5
MAX_TRADES_PER_MONTH = 3
TIME_STOP_DAYS = 90
TRAILING_STOP_PCT = 0.15  # 15% trailing stop after target hit
TARGET_PCT = 1.30  # sell half at +30%
THESIS_BREAK_PCT = -0.20  # exit at -20%

TICKER_THEMES = {
    "UEC": "ai-upstream", "UUUU": "ai-upstream", "NNE": "ai-upstream",
    "MP": "ai-upstream", "VRT": "ai-upstream", "MRVL": "ai-upstream",
    "TDG": "conflict-volatility", "LHX": "conflict-volatility", "CAT": "conflict-volatility",
    "GDXJ": "de-dollarization", "WPM": "de-dollarization", "SLV": "de-dollarization",
}

# Dynamic buy zones: +/- 10% from inauguration price
# This is more realistic than using current prices as buy zones

def fetch_all():
    print("Fetching price data...", file=sys.stderr)
    data = {}
    for sym in TICKER_THEMES:
        try:
            t = yf.Ticker(sym)
            df = t.history(start=START_DATE, end=END_DATE, auto_adjust=True)
            if not df.empty:
                data[sym] = df
                p0 = df['Close'].iloc[0]
                pN = df['Close'].iloc[-1]
                print(f"  {sym}: ${p0:.2f} → ${pN:.2f} ({(pN/p0-1)*100:+.1f}%)", file=sys.stderr)
        except Exception as e:
            print(f"  {sym}: ERROR {e}", file=sys.stderr)
    
    # Fetch VIX
    try:
        vix = yf.Ticker("^VIX").history(start=START_DATE, end=END_DATE)
        data["^VIX"] = vix
    except:
        pass
    
    return data


def run_cosmic_signal_backtest(data):
    """Run the strict Cosmic Signal rules backtest."""
    
    # Get trading dates
    ref_sym = list(TICKER_THEMES.keys())[0]
    all_dates = [d.date() for d in data[ref_sym].index]
    
    # Dynamic buy zones: ±10% from inauguration price
    buy_zones = {}
    for sym in TICKER_THEMES:
        if sym in data:
            p0 = data[sym]['Close'].iloc[0]
            buy_zones[sym] = (p0 * 0.90, p0 * 1.10)  # buy within 10% of start
    
    # Position sizing: proportional to theme weight
    # With $5K, 15% max thematic = $750 total across all themes
    # 3 themes, roughly equal = $250 per theme
    # Per ticker within theme: divide theme budget by number of tickers
    
    theme_tickers = {}
    for sym, theme in TICKER_THEMES.items():
        if theme not in theme_tickers:
            theme_tickers[theme] = []
        theme_tickers[theme].append(sym)
    
    # Position size per ticker: percentage of portfolio
    pos_sizes = {}
    for sym in TICKER_THEMES:
        theme = TICKER_THEMES[sym]
        n_in_theme = len(theme_tickers[theme])
        # 15% total / 3 themes / n tickers per theme
        pos_sizes[sym] = (15 / 3 / n_in_theme)  # % of portfolio
    
    cash = STARTING_CAPITAL
    positions = {}  # sym -> dict
    closed = []
    monthly_trades = {}
    portfolio_values = []
    
    for current_date in all_dates:
        dt = datetime(current_date.year, current_date.month, current_date.day)
        month_key = dt.strftime("%Y-%m")
        monthly_trades.setdefault(month_key, 0)
        
        # Get VIX
        vix = None
        if "^VIX" in data:
            try:
                vix_row = data["^VIX"].loc[data["^VIX"].index.date == current_date]
                if not vix_row.empty:
                    vix = vix_row['Close'].iloc[0]
            except:
                pass
        
        # Get current prices for all held positions
        def get_price(sym, date):
            if sym not in data:
                return None
            try:
                row = data[sym].loc[data[sym].index.date == date]
                if row.empty:
                    return None
                return float(row['Close'].iloc[0])
            except:
                return None
        
        # ─── EXIT CHECKS ───
        for sym in list(positions.keys()):
            pos = positions[sym]
            price = get_price(sym, current_date)
            if price is None:
                continue
            
            days = (dt - pos['entry_date']).days
            pnl_pct = (price / pos['avg_price'] - 1)
            
            # Thesis break: -20%
            if pnl_pct < THESIS_BREAK_PCT:
                proceeds = pos['shares'] * price * (1 - SLIPPAGE)
                cash += proceeds
                closed.append({
                    "sym": sym, "theme": TICKER_THEMES[sym],
                    "entry": pos['avg_price'], "exit": price,
                    "entry_date": pos['entry_date'].strftime("%Y-%m-%d"),
                    "exit_date": current_date.isoformat(),
                    "shares": pos['shares'], "pnl": proceeds - pos['cost'],
                    "pnl_pct": pnl_pct * 100,
                    "reason": f"THESIS BREAK ({pnl_pct*100:.1f}%)",
                    "cost": pos['cost'],
                })
                del positions[sym]
                continue
            
            # Target hit: sell 50%, set trailing stop
            if price >= pos['avg_price'] * TARGET_PCT and not pos.get('partial_exited'):
                half = pos['shares'] // 2
                if half > 0:
                    proceeds = half * price * (1 - SLIPPAGE)
                    cash += proceeds
                    pos['shares'] -= half
                    pos['cost'] -= pos['cost'] * (half / (half + pos['shares']))
                    pos['partial_exited'] = True
                    pos['peak'] = price
            
            # Trailing stop after partial exit
            if pos.get('partial_exited'):
                pos['peak'] = max(pos.get('peak', price), price)
                if price < pos['peak'] * (1 - TRAILING_STOP_PCT):
                    proceeds = pos['shares'] * price * (1 - SLIPPAGE)
                    cash += proceeds
                    closed.append({
                        "sym": sym, "theme": TICKER_THEMES[sym],
                        "entry": pos['avg_price'], "exit": price,
                        "entry_date": pos['entry_date'].strftime("%Y-%m-%d"),
                        "exit_date": current_date.isoformat(),
                        "shares": pos['shares'], "pnl": proceeds - pos['cost'],
                        "pnl_pct": (price / pos['avg_price'] - 1) * 100,
                        "reason": f"TRAILING STOP (peak ${pos['peak']:.2f})",
                        "cost": pos['cost'],
                    })
                    del positions[sym]
                    continue
            
            # Time stop: 90 days, no 10%+ move, exit half
            if days >= TIME_STOP_DAYS and abs(pnl_pct) < 0.10 and not pos.get('partial_exited'):
                half = pos['shares'] // 2
                if half > 0:
                    proceeds = half * price * (1 - SLIPPAGE)
                    cash += proceeds
                    pos['shares'] -= half
                    pos['cost'] -= pos['cost'] * (half / (half + pos['shares']))
                    pos['partial_exited'] = True
                    pos['peak'] = price
        
        # ─── ENTRY CHECKS ───
        # Skip if VIX > 30
        if vix and vix > 30:
            pass  # still check exits above, but no entries
        elif monthly_trades[month_key] < MAX_TRADES_PER_MONTH and len(positions) < MAX_POSITIONS:
            # Calculate total portfolio value
            pos_value = sum(
                positions[s]['shares'] * (get_price(s, current_date) or 0)
                for s in positions
            )
            total = cash + pos_value
            min_cash = total * (MIN_CASH_PCT / 100)
            available = cash - min_cash
            
            if available > 0:
                # Try to enter tickers in buy zone
                for sym in TICKER_THEMES:
                    if sym in positions:
                        continue
                    if monthly_trades[month_key] >= MAX_TRADES_PER_MONTH:
                        break
                    if len(positions) >= MAX_POSITIONS:
                        break
                    
                    price = get_price(sym, current_date)
                    if price is None:
                        continue
                    
                    lo, hi = buy_zones[sym]
                    if not (lo <= price <= hi):
                        continue
                    
                    # Position size
                    pos_pct = pos_sizes[sym]
                    budget = min(total * pos_pct / 100, available)
                    shares = int(budget * SCALE_IN[0] / (price * (1 + SLIPPAGE)))
                    
                    if shares < 1:
                        continue
                    
                    cost = shares * price * (1 + SLIPPAGE)
                    if cost > available:
                        shares = int(available / (price * (1 + SLIPPAGE)))
                        cost = shares * price * (1 + SLIPPAGE)
                    if shares < 1:
                        continue
                    
                    cash -= cost
                    positions[sym] = {
                        'shares': shares,
                        'avg_price': price * (1 + SLIPPAGE),
                        'cost': cost,
                        'entry_date': dt,
                        'theme': TICKER_THEMES[sym],
                        'partial_exited': False,
                        'peak': price,
                    }
                    monthly_trades[month_key] += 1
        
        # ─── SCALE-IN ───
        for sym in list(positions.keys()):
            pos = positions[sym]
            if pos.get('partial_exited'):
                continue
            price = get_price(sym, current_date)
            if price is None:
                continue
            days = (dt - pos['entry_date']).days
            # Scale in at 5, 10 trading days
            scales_done = pos.get('scales_done', 1)
            if scales_done >= 3:
                continue
            
            lo, hi = buy_zones[sym]
            if not (lo <= price <= hi):
                continue
            
            if days >= 5 * scales_done:
                pos_value = sum(
                    positions[s]['shares'] * (get_price(s, current_date) or 0)
                    for s in positions
                )
                total = cash + pos_value
                available = cash - total * (MIN_CASH_PCT / 100)
                
                pos_pct = pos_sizes[sym]
                budget = min(total * pos_pct / 100 * SCALE_IN[scales_done], available)
                add_shares = int(budget / (price * (1 + SLIPPAGE)))
                
                if add_shares >= 1:
                    cost = add_shares * price * (1 + SLIPPAGE)
                    total_cost = pos['cost'] + cost
                    total_shares = pos['shares'] + add_shares
                    pos['avg_price'] = total_cost / total_shares
                    pos['shares'] = total_shares
                    pos['cost'] = total_cost
                    pos['scales_done'] = scales_done + 1
                    cash -= cost
        
        # ─── LOG ───
        pos_value = sum(
            positions[s]['shares'] * (get_price(s, current_date) or 0)
            for s in positions
        )
        total = cash + pos_value
        portfolio_values.append({
            "date": current_date.isoformat(),
            "total": round(total, 2),
            "cash": round(cash, 2),
            "positions": round(pos_value, 2),
            "n_pos": len(positions),
        })
    
    # Close remaining
    for sym in list(positions.keys()):
        pos = positions[sym]
        price = get_price(sym, all_dates[-1])
        if price:
            proceeds = pos['shares'] * price * (1 - SLIPPAGE)
            cash += proceeds
            closed.append({
                "sym": sym, "theme": TICKER_THEMES[sym],
                "entry": pos['avg_price'], "exit": price,
                "entry_date": pos['entry_date'].strftime("%Y-%m-%d"),
                "exit_date": all_dates[-1].isoformat(),
                "shares": pos['shares'], "pnl": proceeds - pos['cost'],
                "pnl_pct": (price / pos['avg_price'] - 1) * 100,
                "reason": "END OF BACKTEST",
                "cost": pos['cost'],
            })
    
    final = cash
    return final, closed, portfolio_values, monthly_trades


def run_buy_and_hold(data):
    """Simple buy-and-hold: equal weight all 12 tickers at inauguration."""
    n = len(TICKER_THEMES)
    per_ticker = STARTING_CAPITAL / n
    
    total = 0
    details = []
    for sym in TICKER_THEMES:
        if sym not in data:
            continue
        df = data[sym]
        p0 = df['Close'].iloc[0]
        pN = df['Close'].iloc[-1]
        shares = per_ticker / p0
        value = shares * pN
        total += value
        details.append({
            "sym": sym,
            "start": round(p0, 2),
            "end": round(pN, 2),
            "return_pct": round((pN/p0 - 1)*100, 1),
            "value": round(value, 2),
        })
    
    return total, details


def run_sp500_benchmark(data):
    """SPY buy-and-hold benchmark."""
    try:
        spy = yf.Ticker("SPY").history(start=START_DATE, end=END_DATE, auto_adjust=True)
        if spy.empty:
            return None, None
        p0 = spy['Close'].iloc[0]
        pN = spy['Close'].iloc[-1]
        return (pN/p0 - 1) * 100, {"start": round(p0,2), "end": round(pN,2)}
    except:
        return None, None


if __name__ == "__main__":
    data = fetch_all()
    
    # Cosmic Signal strict rules
    cs_final, cs_closed, cs_log, cs_monthly = run_cosmic_signal_backtest(data)
    cs_return = (cs_final / STARTING_CAPITAL - 1) * 100
    
    # Buy and hold
    bh_final, bh_details = run_buy_and_hold(data)
    bh_return = (bh_final / STARTING_CAPITAL - 1) * 100
    
    # SPY benchmark
    spy_return, spy_details = run_sp500_benchmark(data)
    
    # ─── OUTPUT ───
    print("=" * 60)
    print("COSMIC SIGNAL BACKTEST — TRUMP 2.0 ERA")
    print(f"Period: {START_DATE} → {END_DATE}")
    print(f"Starting Capital: ${STARTING_CAPITAL:,.0f}")
    print("=" * 60)
    
    print(f"\n{'─'*40}")
    print("COSMIC SIGNAL (strict rules)")
    print(f"{'─'*40}")
    print(f"Final Value:   ${cs_final:,.2f}")
    print(f"Total Return:  {cs_return:+.2f}%")
    print(f"Total Trades:  {len(cs_closed)}")
    
    wins = [t for t in cs_closed if t['pnl'] > 0]
    losses = [t for t in cs_closed if t['pnl'] <= 0]
    print(f"Win Rate:      {len(wins)}/{len(cs_closed)} ({len(wins)/max(len(cs_closed),1)*100:.0f}%)")
    if wins:
        print(f"Avg Win:       +{sum(t['pnl_pct'] for t in wins)/len(wins):.1f}%")
    if losses:
        print(f"Avg Loss:      {sum(t['pnl_pct'] for t in losses)/len(losses):.1f}%")
    
    print(f"\nClosed Trades:")
    for t in cs_closed:
        arrow = "✓" if t['pnl'] > 0 else "✗"
        print(f"  {arrow} ${t['sym']:5s} | {t['entry_date']} → {t['exit_date']} | {t['pnl_pct']:+6.1f}% | ${t['pnl']:+8.2f} | {t['reason']}")
    
    print(f"\n{'─'*40}")
    print("EQUAL-WEIGHT BUY & HOLD (all 12 tickers)")
    print(f"{'─'*40}")
    print(f"Final Value:   ${bh_final:,.2f}")
    print(f"Total Return:  {bh_return:+.2f}%")
    print(f"\nPer Ticker:")
    for d in sorted(bh_details, key=lambda x: x['return_pct'], reverse=True):
        arrow = "✓" if d['return_pct'] > 0 else "✗"
        print(f"  {arrow} ${d['sym']:5s} | ${d['start']:>8.2f} → ${d['end']:>8.2f} | {d['return_pct']:+7.1f}% | ${d['value']:>8.2f}")
    
    if spy_return is not None:
        print(f"\n{'─'*40}")
        print("SPY (S&P 500) BUY & HOLD")
        print(f"{'─'*40}")
        print(f"Return:        {spy_return:+.2f}%")
        print(f"SPY:           ${spy_details['start']} → ${spy_details['end']}")
    
    print(f"\n{'='*60}")
    print("SUMMARY COMPARISON")
    print(f"{'='*60}")
    print(f"  Cosmic Signal (rules):  {cs_return:+.2f}%  →  ${cs_final:,.2f}")
    print(f"  Buy & Hold (12 tickers):{bh_return:+.2f}%  →  ${bh_final:,.2f}")
    if spy_return is not None:
        print(f"  SPY Buy & Hold:         {spy_return:+.2f}%")
    
    # Key dates in portfolio
    print(f"\nPortfolio Value Over Time (key dates):")
    key_dates = [cs_log[0]] + cs_log[::20] + [cs_log[-1]]
    for p in key_dates:
        print(f"  {p['date']}  ${p['total']:>8.2f}  (cash: ${p['cash']:>8.2f}, positions: {p['n_pos']})")
