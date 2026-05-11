#!/usr/bin/env python3
"""
COSMIC SIGNAL — Backtest V4: AGGRESSIVE / MAX RETURN
Pushing for asymmetric upside. Accepting deeper drawdowns.
Key changes from V3:
- Larger positions (15-20%)
- Even wider stops (-45% miners, -30% mid-caps)
- No partial exit at +50% — let winners run to trailing stop only
- Wider trailing stop (25%) so winners aren't cut short
- 5% cash reserve (was 10%)
- 10 max positions (was 8)
- No VIX gate — stay invested through fear
- Faster scale-in: 80/20
- 6 trades/month (was 4)
"""

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import sys

START_DATE = "2025-01-20"
END_DATE = "2026-05-09"
STARTING_CAPITAL = 5000.0
SLIPPAGE = 0.002

MAX_POSITIONS = 10
MAX_TRADES_PER_MONTH = 6
MIN_CASH_PCT = 5
SCALE_IN = [0.80, 0.20]
TIME_STOP_DAYS = 120
TRAILING_STOP_PCT = 0.25  # wider trailing
TARGET_PCT = 2.00  # +200% before partial exit (effectively lets it ride)
PARTIAL_EXIT_PCT = 0.30  # sell 30% at target, keep 70% riding

TICKER_CONFIG = {
    "UEC":  {"theme": "ai-upstream",       "risk": "high",      "pos_pct": 18, "stop_pct": -45},
    "UUUU": {"theme": "ai-upstream",       "risk": "high",      "pos_pct": 18, "stop_pct": -45},
    "NNE":  {"theme": "ai-upstream",       "risk": "very_high", "pos_pct": 15, "stop_pct": -50},
    "MP":   {"theme": "ai-upstream",       "risk": "medium",    "pos_pct": 20, "stop_pct": -30},
    "VRT":  {"theme": "ai-upstream",       "risk": "medium",    "pos_pct": 20, "stop_pct": -30},
    "MRVL": {"theme": "ai-upstream",       "risk": "medium",    "pos_pct": 20, "stop_pct": -30},
    "TDG":  {"theme": "conflict-volatility","risk": "low",      "pos_pct": 15, "stop_pct": -25},
    "LHX":  {"theme": "conflict-volatility","risk": "medium",   "pos_pct": 18, "stop_pct": -30},
    "CAT":  {"theme": "conflict-volatility","risk": "low",      "pos_pct": 15, "stop_pct": -25},
    "GDXJ": {"theme": "de-dollarization",  "risk": "high",      "pos_pct": 18, "stop_pct": -40},
    "WPM":  {"theme": "de-dollarization",  "risk": "low",       "pos_pct": 15, "stop_pct": -25},
    "SLV":  {"theme": "de-dollarization",  "risk": "medium",    "pos_pct": 18, "stop_pct": -30},
}


def fetch_all():
    print("Fetching price data...", file=sys.stderr)
    data = {}
    for sym in TICKER_CONFIG:
        try:
            df = yf.Ticker(sym).history(start=START_DATE, end=END_DATE, auto_adjust=True)
            if not df.empty:
                df['SMA50'] = df['Close'].rolling(50).mean()
                data[sym] = df
        except:
            pass
    try:
        data["^VIX"] = yf.Ticker("^VIX").history(start=START_DATE, end=END_DATE)
    except:
        pass
    try:
        data["SPY"] = yf.Ticker("SPY").history(start=START_DATE, end=END_DATE, auto_adjust=True)
    except:
        pass
    return data


def get_price(data, sym, date):
    if sym not in data:
        return None, None
    try:
        row = data[sym].loc[data[sym].index.date == date]
        if row.empty:
            return None, None
        price = float(row['Close'].iloc[0])
        sma50 = float(row['SMA50'].iloc[0]) if not pd.isna(row['SMA50'].iloc[0]) else None
        return price, sma50
    except:
        return None, None


def run_backtest(data):
    ref_sym = list(TICKER_CONFIG.keys())[0]
    all_dates = [d.date() for d in data[ref_sym].index]

    cash = STARTING_CAPITAL
    positions = {}
    closed = []
    monthly_trades = {}
    portfolio_values = []
    max_drawdown = 0
    peak_portfolio = STARTING_CAPITAL

    inaugural_prices = {}
    for sym in TICKER_CONFIG:
        if sym in data:
            inaugural_prices[sym] = data[sym]['Close'].iloc[0]

    for current_date in all_dates:
        dt = datetime(current_date.year, current_date.month, current_date.day)
        month_key = dt.strftime("%Y-%m")
        monthly_trades.setdefault(month_key, 0)

        # ─── EXIT CHECKS ───
        for sym in list(positions.keys()):
            pos = positions[sym]
            price, sma50 = get_price(data, sym, current_date)
            if price is None:
                continue

            days = (dt - pos['entry_date']).days
            pnl_pct = (price / pos['avg_price'] - 1)
            config = TICKER_CONFIG[sym]

            # THESIS BREAK (wider stops)
            if pnl_pct < (config['stop_pct'] / 100):
                proceeds = pos['shares'] * price * (1 - SLIPPAGE)
                cash += proceeds
                closed.append({
                    "sym": sym, "theme": config['theme'],
                    "entry": pos['avg_price'], "exit": price,
                    "entry_date": pos['entry_date'].strftime("%Y-%m-%d"),
                    "exit_date": current_date.isoformat(),
                    "shares": pos['shares'], "pnl": proceeds - pos['cost'],
                    "pnl_pct": pnl_pct * 100,
                    "reason": f"THESIS BREAK ({pnl_pct*100:.1f}%, stop: {config['stop_pct']}%)",
                })
                del positions[sym]
                continue

            # PARTIAL EXIT at high target (sell 30%, keep 70%)
            if price >= pos['avg_price'] * TARGET_PCT and not pos.get('partial_exited'):
                sell_shares = int(pos['shares'] * PARTIAL_EXIT_PCT)
                if sell_shares >= 1:
                    proceeds = sell_shares * price * (1 - SLIPPAGE)
                    cash += proceeds
                    pos['shares'] -= sell_shares
                    pos['cost'] -= pos['cost'] * (sell_shares / (sell_shares + pos['shares']))
                    pos['partial_exited'] = True
                    pos['peak'] = price

            # TRAILING STOP after partial exit
            if pos.get('partial_exited'):
                pos['peak'] = max(pos.get('peak', price), price)
                if price < pos['peak'] * (1 - TRAILING_STOP_PCT):
                    proceeds = pos['shares'] * price * (1 - SLIPPAGE)
                    cash += proceeds
                    closed.append({
                        "sym": sym, "theme": config['theme'],
                        "entry": pos['avg_price'], "exit": price,
                        "entry_date": pos['entry_date'].strftime("%Y-%m-%d"),
                        "exit_date": current_date.isoformat(),
                        "shares": pos['shares'], "pnl": proceeds - pos['cost'],
                        "pnl_pct": (price / pos['avg_price'] - 1) * 100,
                        "reason": f"TRAILING STOP (peak ${pos['peak']:.2f})",
                    })
                    del positions[sym]
                    continue

            # TIME STOP: 120 days, no 30%+ move, exit half
            if days >= TIME_STOP_DAYS and abs(pnl_pct) < 0.30 and not pos.get('partial_exited'):
                half = pos['shares'] // 2
                if half >= 1:
                    proceeds = half * price * (1 - SLIPPAGE)
                    cash += proceeds
                    pos['shares'] -= half
                    pos['cost'] -= pos['cost'] * (half / (half + pos['shares']))
                    pos['partial_exited'] = True
                    pos['peak'] = price

            # MAX HOLD: 720 days
            if days >= 720:
                proceeds = pos['shares'] * price * (1 - SLIPPAGE)
                cash += proceeds
                closed.append({
                    "sym": sym, "theme": config['theme'],
                    "entry": pos['avg_price'], "exit": price,
                    "entry_date": pos['entry_date'].strftime("%Y-%m-%d"),
                    "exit_date": current_date.isoformat(),
                    "shares": pos['shares'], "pnl": proceeds - pos['cost'],
                    "pnl_pct": (price / pos['avg_price'] - 1) * 100,
                    "reason": "MAX HOLD (720d)",
                })
                del positions[sym]

        # ─── ENTRY CHECKS (no VIX gate) ───
        if monthly_trades[month_key] < MAX_TRADES_PER_MONTH and len(positions) < MAX_POSITIONS:
            pos_value = sum(
                positions[s]['shares'] * (get_price(data, s, current_date)[0] or 0)
                for s in positions
            )
            total = cash + pos_value
            available = cash - total * (MIN_CASH_PCT / 100)

            if available > 30:
                for sym, config in TICKER_CONFIG.items():
                    if sym in positions:
                        continue
                    if monthly_trades[month_key] >= MAX_TRADES_PER_MONTH:
                        break
                    if len(positions) >= MAX_POSITIONS:
                        break

                    price, sma50 = get_price(data, sym, current_date)
                    if price is None:
                        continue

                    # Entry: value zone OR trend confirmed
                    in_value_zone = False
                    if sym in inaugural_prices:
                        p0 = inaugural_prices[sym]
                        in_value_zone = (p0 * 0.55 <= price <= p0 * 1.25)  # wider value zone

                    trend_confirmed = (sma50 is not None and price > sma50)

                    # In aggressive mode, also buy on VIX spike (fear = opportunity)
                    vix_spike = False
                    if "^VIX" in data:
                        try:
                            vix_row = data["^VIX"].loc[data["^VIX"].index.date == current_date]
                            if not vix_row.empty:
                                vix_val = float(vix_row['Close'].iloc[0])
                                vix_spike = vix_val > 25  # buy fear
                        except:
                            pass

                    if not (in_value_zone or trend_confirmed or vix_spike):
                        continue

                    budget = min(total * config['pos_pct'] / 100, available)
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
                    signal = 'value' if in_value_zone else ('fear' if vix_spike else 'trend')
                    positions[sym] = {
                        'shares': shares,
                        'avg_price': price * (1 + SLIPPAGE),
                        'cost': cost,
                        'entry_date': dt,
                        'partial_exited': False,
                        'peak': price,
                        'scales_done': 1,
                        'entry_signal': signal,
                    }
                    monthly_trades[month_key] += 1

        # ─── SCALE-IN ───
        for sym in list(positions.keys()):
            pos = positions[sym]
            if pos.get('partial_exited') or pos.get('scales_done', 1) >= 2:
                continue
            price, sma50 = get_price(data, sym, current_date)
            if price is None:
                continue
            days = (dt - pos['entry_date']).days
            if days >= 3:  # faster scale-in
                pos_value = sum(
                    positions[s]['shares'] * (get_price(data, s, current_date)[0] or 0)
                    for s in positions
                )
                total = cash + pos_value
                available = cash - total * (MIN_CASH_PCT / 100)

                budget = min(total * TICKER_CONFIG[sym]['pos_pct'] / 100 * SCALE_IN[1], available)
                add_shares = int(budget / (price * (1 + SLIPPAGE)))

                if add_shares >= 1:
                    cost = add_shares * price * (1 + SLIPPAGE)
                    total_cost = pos['cost'] + cost
                    total_shares = pos['shares'] + add_shares
                    pos['avg_price'] = total_cost / total_shares
                    pos['shares'] = total_shares
                    pos['cost'] = total_cost
                    pos['scales_done'] = 2
                    cash -= cost

        # ─── LOG ───
        pos_value = sum(
            positions[s]['shares'] * (get_price(data, s, current_date)[0] or 0)
            for s in positions
        )
        total = cash + pos_value
        peak_portfolio = max(peak_portfolio, total)
        drawdown = (total - peak_portfolio) / peak_portfolio * 100
        max_drawdown = min(max_drawdown, drawdown)

        portfolio_values.append({
            "date": current_date.isoformat(),
            "total": round(total, 2),
            "cash": round(cash, 2),
            "positions": round(pos_value, 2),
            "n_pos": len(positions),
            "dd": round(drawdown, 1),
        })

    # Close remaining
    for sym in list(positions.keys()):
        pos = positions[sym]
        price, _ = get_price(data, sym, all_dates[-1])
        if price:
            proceeds = pos['shares'] * price * (1 - SLIPPAGE)
            cash += proceeds
            closed.append({
                "sym": sym, "theme": TICKER_CONFIG[sym]['theme'],
                "entry": pos['avg_price'], "exit": price,
                "entry_date": pos['entry_date'].strftime("%Y-%m-%d"),
                "exit_date": all_dates[-1].isoformat(),
                "shares": pos['shares'], "pnl": proceeds - pos['cost'],
                "pnl_pct": (price / pos['avg_price'] - 1) * 100,
                "reason": "STILL HELD",
                "entry_signal": pos.get('entry_signal', ''),
            })

    return cash, closed, portfolio_values, monthly_trades, max_drawdown


def run_benchmarks(data):
    n = len(TICKER_CONFIG)
    per_ticker = STARTING_CAPITAL / n
    bh_total = 0
    for sym in TICKER_CONFIG:
        if sym not in data:
            continue
        p0 = data[sym]['Close'].iloc[0]
        pN = data[sym]['Close'].iloc[-1]
        bh_total += (per_ticker / p0) * pN
    spy_return = None
    if "SPY" in data:
        p0 = data["SPY"]['Close'].iloc[0]
        pN = data["SPY"]['Close'].iloc[-1]
        spy_return = round((pN/p0-1)*100, 2)
    bh_return = (bh_total / STARTING_CAPITAL - 1) * 100
    return bh_total, bh_return, spy_return


if __name__ == "__main__":
    data = fetch_all()
    final, closed, log, monthly, max_dd = run_backtest(data)
    cs_return = (final / STARTING_CAPITAL - 1) * 100
    bh_total, bh_return, spy_return = run_benchmarks(data)

    print("=" * 65)
    print("COSMIC SIGNAL BACKTEST V4 — AGGRESSIVE")
    print(f"Period: {START_DATE} → {END_DATE} | Starting: ${STARTING_CAPITAL:,.0f}")
    print("=" * 65)

    print(f"\n{'─'*50}")
    print("AGGRESSIVE COSMIC SIGNAL")
    print(f"{'─'*50}")
    print(f"Final Value:     ${final:,.2f}")
    print(f"Total Return:    {cs_return:+.2f}%")
    print(f"Max Drawdown:    {max_dd:.1f}%")
    print(f"Total Trades:    {len(closed)}")

    wins = [t for t in closed if t['pnl'] > 0]
    losses = [t for t in closed if t['pnl'] <= 0]
    print(f"Win Rate:        {len(wins)}/{len(closed)} ({len(wins)/max(len(closed),1)*100:.0f}%)")
    if wins:
        avg_win = sum(t['pnl_pct'] for t in wins)/len(wins)
        best = max(wins, key=lambda t: t['pnl_pct'])
        print(f"Avg Win:         +{avg_win:.1f}%")
        print(f"Best Trade:      ${best['sym']} +{best['pnl_pct']:.1f}%")
    if losses:
        avg_loss = sum(t['pnl_pct'] for t in losses)/len(losses)
        worst = min(losses, key=lambda t: t['pnl_pct'])
        print(f"Avg Loss:        {avg_loss:.1f}%")
        print(f"Worst Trade:     ${worst['sym']} {worst['pnl_pct']:.1f}%")

    total_wins = sum(t['pnl'] for t in wins) if wins else 0
    total_losses = abs(sum(t['pnl'] for t in losses)) if losses else 0.01
    print(f"Profit Factor:   {total_wins/total_losses:.2f}")

    # Risk-adjusted
    if max_dd != 0:
        print(f"Return/MaxDD:    {abs(cs_return/max_dd):.2f}x")

    print(f"\nAll Trades:")
    for t in closed:
        arrow = "✓" if t['pnl'] > 0 else "✗"
        signal = t.get('entry_signal', '')
        print(f"  {arrow} ${t['sym']:5s} | {t['entry_date']} → {t['exit_date']} | {t['pnl_pct']:+7.1f}% | ${t['pnl']:+10.2f} | {t['reason']} [{signal}]")

    # Theme breakdown
    print(f"\nBy Theme:")
    themes = {}
    for t in closed:
        theme = t['theme']
        if theme not in themes:
            themes[theme] = {'pnl': 0, 'trades': 0, 'wins': 0}
        themes[theme]['pnl'] += t['pnl']
        themes[theme]['trades'] += 1
        if t['pnl'] > 0:
            themes[theme]['wins'] += 1
    for theme, stats in themes.items():
        print(f"  {theme:25s} | {stats['trades']} trades, {stats['wins']} wins | ${stats['pnl']:+.2f}")

    print(f"\n{'─'*50}")
    print("COMPARISON")
    print(f"{'─'*50}")
    print(f"  V1 (old rules):        +1.34%   →  $5,067")
    print(f"  V3 (optimized):        +58.28%  →  $7,914")
    print(f"  V4 (aggressive):       {cs_return:+.2f}%  →  ${final:,.2f}")
    print(f"  Buy & Hold (12 equal): {bh_return:+.2f}%  →  ${bh_total:,.2f}")
    if spy_return:
        print(f"  SPY Buy & Hold:        {spy_return:+.2f}%")

    print(f"\nPortfolio Curve (monthly):")
    monthly_snap = log[::22]
    for p in monthly_snap:
        bar_len = int(max(0, (p['total'] - 4500) / 50))
        bar = "█" * bar_len
        print(f"  {p['date']}  ${p['total']:>8.0f}  {bar}  DD:{p['dd']:.0f}%  pos:{p['n_pos']}")
