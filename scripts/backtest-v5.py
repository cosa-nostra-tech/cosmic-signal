#!/usr/bin/env python3
"""
COSMIC SIGNAL — 5 ARMY + LEAPS BACKTEST (V5)
Meta-thesis: Deglobalization → Conflict → Energy insecurity → Fossil resurgence
AND nuclear renaissance simultaneously → Electrification demand explodes
→ Critical mineral supply chains bottleneck → AI needs all of the above
"""
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime
import sys

START_DATE = "2025-01-20"
END_DATE = "2026-05-09"
STARTING_CAPITAL = 5000.0
SLIPPAGE = 0.003

# ─── 5 ARMIES ───
ARMIES = {
    "nuclear-renaissance": {
        "allocation": 0.30,
        "tickers": ["UUUU", "UEC", "SMR"],
        "stop_pct": -40,
    },
    "critical-minerals": {
        "allocation": 0.25,
        "tickers": ["MP", "NNE", "GDXJ"],
        "stop_pct": -35,
    },
    "fossil-contrarian": {
        "allocation": 0.15,
        "tickers": ["BTU", "AMR", "CAT"],
        "stop_pct": -25,
    },
    "defense-base": {
        "allocation": 0.15,
        "tickers": ["LHX", "KTOS", "VRT"],
        "stop_pct": -25,
    },
    "hard-money": {
        "allocation": 0.15,
        "tickers": ["WPM", "SLV", "GDXJ"],
        "stop_pct": -20,
    },
}

LEAPS_ALLOCATION = 0.20
LEAPS_LEVERAGE = 2.5

MAX_POSITIONS = 12
MAX_TRADES_PER_MONTH = 6
MIN_CASH_PCT = 5
TRAILING_STOP_PCT = 0.25
TIME_STOP_DAYS = 120
TARGET_FOR_PARTIAL = 2.0

TICKER_STOPS = {}
for army, cfg in ARMIES.items():
    for s in cfg["tickers"]:
        if s not in TICKER_STOPS or cfg["stop_pct"] > TICKER_STOPS.get(s, -99):
            TICKER_STOPS[s] = cfg["stop_pct"]
TICKER_STOPS["GDXJ"] = -20

ALL_TICKERS = list(TICKER_STOPS.keys())

print("Fetching data...", file=sys.stderr)
data = {}
for sym in ALL_TICKERS:
    try:
        df = yf.Ticker(sym).history(start=START_DATE, end=END_DATE, auto_adjust=True)
        if not df.empty:
            df["SMA50"] = df["Close"].rolling(50).mean()
            data[sym] = df
    except Exception:
        pass
print(f"Got {len(data)} tickers", file=sys.stderr)


def get_price(sym, date):
    if sym not in data:
        return None, None
    try:
        row = data[sym].loc[data[sym].index.date == date]
        if row.empty:
            return None, None
        p = float(row["Close"].iloc[0])
        s = float(row["SMA50"].iloc[0]) if not pd.isna(row["SMA50"].iloc[0]) else None
        return p, s
    except Exception:
        return None, None


def run_backtest(data):
    ref = list(data.keys())[0]
    all_dates = [d.date() for d in data[ref].index]

    cash = STARTING_CAPITAL
    positions = {}
    closed = []
    monthly_trades = {}
    peak_portfolio = STARTING_CAPITAL
    max_dd = 0
    leaps_active = {}

    inaugural = {}
    for s in ALL_TICKERS:
        p, _ = get_price(s, all_dates[0])
        if p:
            inaugural[s] = p

    for current_date in all_dates:
        dt = datetime(current_date.year, current_date.month, current_date.day)
        mk = dt.strftime("%Y-%m")
        monthly_trades.setdefault(mk, 0)

        # ─── EXITS ───
        for sym in list(positions.keys()):
            pos = positions[sym]
            price, sma = get_price(sym, current_date)
            if price is None:
                continue

            days = (dt - pos["entry_date"]).days
            pnl = price / pos["avg_price"] - 1
            stop = TICKER_STOPS.get(sym, -25) / 100

            # Thesis break
            if pnl < stop:
                if pos.get("is_leaps"):
                    option_value = pos["cost"] * max(0.05, 1 + pnl * pos["leverage"])
                    proceeds = option_value * (1 - SLIPPAGE)
                else:
                    proceeds = pos["shares"] * price * (1 - SLIPPAGE)
                cash += proceeds
                closed.append({
                    "sym": sym, "entry": pos["avg_price"], "exit": price,
                    "entry_date": pos["entry_date"].strftime("%Y-%m-%d"),
                    "exit_date": current_date.isoformat(),
                    "shares": pos["shares"], "pnl": proceeds - pos["cost"],
                    "pnl_pct": (proceeds / pos["cost"] - 1) * 100,
                    "reason": f"THESIS BREAK ({pnl*100:.1f}%)",
                    "army": pos.get("army", ""), "leaps": pos.get("is_leaps", False),
                })
                del positions[sym]
                continue

            # Partial exit at +200% for stocks
            if pnl >= TARGET_FOR_PARTIAL and not pos.get("partial_exited") and not pos.get("is_leaps"):
                sell = pos["shares"] // 2
                if sell >= 1:
                    proceeds = sell * price * (1 - SLIPPAGE)
                    cash += proceeds
                    pos["shares"] -= sell
                    pos["cost"] -= pos["cost"] * (sell / (sell + pos["shares"]))
                    pos["partial_exited"] = True
                    pos["peak"] = price

            # Trailing stop after partial (stocks)
            if pos.get("partial_exited") and not pos.get("is_leaps"):
                pos["peak"] = max(pos.get("peak", price), price)
                if price < pos["peak"] * (1 - TRAILING_STOP_PCT):
                    proceeds = pos["shares"] * price * (1 - SLIPPAGE)
                    cash += proceeds
                    closed.append({
                        "sym": sym, "entry": pos["avg_price"], "exit": price,
                        "entry_date": pos["entry_date"].strftime("%Y-%m-%d"),
                        "exit_date": current_date.isoformat(),
                        "shares": pos["shares"], "pnl": proceeds - pos["cost"],
                        "pnl_pct": (proceeds / pos["cost"] - 1) * 100,
                        "reason": f"TRAILING STOP (peak ${pos['peak']:.2f})",
                        "army": pos.get("army", ""), "leaps": False,
                    })
                    del positions[sym]
                    continue

            # LEAPS trailing: if underlying up 150%+
            if pos.get("is_leaps") and pnl >= 1.5:
                pos["peak"] = max(pos.get("peak", price), price)
                if price < pos["peak"] * (1 - TRAILING_STOP_PCT):
                    option_value = pos["cost"] * max(0.1, 1 + pnl * pos["leverage"])
                    proceeds = option_value * (1 - SLIPPAGE)
                    cash += proceeds
                    closed.append({
                        "sym": sym, "entry": pos["avg_price"], "exit": price,
                        "entry_date": pos["entry_date"].strftime("%Y-%m-%d"),
                        "exit_date": current_date.isoformat(),
                        "shares": pos["shares"], "pnl": proceeds - pos["cost"],
                        "pnl_pct": (proceeds / pos["cost"] - 1) * 100,
                        "reason": f"LEAPS TRAIL (underlying {pnl*100:.0f}%)",
                        "army": pos.get("army", ""), "leaps": True,
                    })
                    del positions[sym]
                    continue

            # Time stop: 120 days, no 30%+ move
            if days >= TIME_STOP_DAYS and abs(pnl) < 0.30 and not pos.get("partial_exited") and not pos.get("is_leaps"):
                half = pos["shares"] // 2
                if half >= 1:
                    proceeds = half * price * (1 - SLIPPAGE)
                    cash += proceeds
                    pos["shares"] -= half
                    pos["partial_exited"] = True
                    pos["peak"] = price

            # LEAPS time stop: 360 days
            if pos.get("is_leaps") and days >= 360:
                option_value = pos["cost"] * max(0.1, 1 + pnl * pos["leverage"])
                proceeds = option_value * (1 - SLIPPAGE)
                cash += proceeds
                closed.append({
                    "sym": sym, "entry": pos["avg_price"], "exit": price,
                    "entry_date": pos["entry_date"].strftime("%Y-%m-%d"),
                    "exit_date": current_date.isoformat(),
                    "shares": pos["shares"], "pnl": proceeds - pos["cost"],
                    "pnl_pct": (proceeds / pos["cost"] - 1) * 100,
                    "reason": "LEAPS TIME STOP (360d)",
                    "army": pos.get("army", ""), "leaps": True,
                })
                del positions[sym]
                continue

            # Max hold: 720 days
            if days >= 720:
                if pos.get("is_leaps"):
                    option_value = pos["cost"] * max(0.1, 1 + pnl * pos["leverage"])
                    proceeds = option_value * (1 - SLIPPAGE)
                else:
                    proceeds = pos["shares"] * price * (1 - SLIPPAGE)
                cash += proceeds
                closed.append({
                    "sym": sym, "entry": pos["avg_price"], "exit": price,
                    "entry_date": pos["entry_date"].strftime("%Y-%m-%d"),
                    "exit_date": current_date.isoformat(),
                    "shares": pos["shares"], "pnl": proceeds - pos["cost"],
                    "pnl_pct": (proceeds / pos["cost"] - 1) * 100,
                    "reason": "MAX HOLD",
                    "army": pos.get("army", ""), "leaps": pos.get("is_leaps", False),
                })
                del positions[sym]

        # ─── ENTRIES ───
        if monthly_trades[mk] < MAX_TRADES_PER_MONTH and len(positions) < MAX_POSITIONS:
            pos_value = sum(
                positions[s]["shares"] * (get_price(s, current_date)[0] or 0)
                for s in positions
                if not positions[s].get("is_leaps")
            )
            leaps_value = sum(
                positions[s]["cost"]
                for s in positions
                if positions[s].get("is_leaps")
            )
            total = cash + pos_value + leaps_value
            available = cash - total * (MIN_CASH_PCT / 100)

            if available > 50:
                for army_name, army_cfg in ARMIES.items():
                    if monthly_trades[mk] >= MAX_TRADES_PER_MONTH:
                        break
                    if len(positions) >= MAX_POSITIONS:
                        break

                    per_ticker = total * army_cfg["allocation"] / len(army_cfg["tickers"])

                    for sym in army_cfg["tickers"]:
                        if sym in positions:
                            continue
                        if sym not in data:
                            continue
                        if monthly_trades[mk] >= MAX_TRADES_PER_MONTH:
                            break
                        if len(positions) >= MAX_POSITIONS:
                            break

                        price, sma = get_price(sym, current_date)
                        if price is None:
                            continue

                        in_value = False
                        if sym in inaugural:
                            p0 = inaugural[sym]
                            in_value = p0 * 0.55 <= price <= p0 * 1.25

                        trend = sma is not None and price > sma

                        if not (in_value or trend):
                            continue

                        use_leaps = (
                            army_name in ["nuclear-renaissance", "critical-minerals"]
                            and sym not in leaps_active
                            and total * LEAPS_ALLOCATION / 2 > 100
                        )

                        if use_leaps:
                            budget = min(per_ticker, available, total * LEAPS_ALLOCATION / 2)
                            option_cost = price * (1 / LEAPS_LEVERAGE) * 1.1
                            units = int(budget / (option_cost * (1 + SLIPPAGE)))
                            if units < 1:
                                continue
                            cost = units * option_cost * (1 + SLIPPAGE)
                            if cost > available:
                                continue

                            cash -= cost
                            positions[sym] = {
                                "shares": units,
                                "avg_price": option_cost * (1 + SLIPPAGE),
                                "cost": cost,
                                "entry_date": dt,
                                "partial_exited": False,
                                "peak": price,
                                "leverage": LEAPS_LEVERAGE,
                                "is_leaps": True,
                                "army": army_name,
                                "scales_done": 2,
                            }
                            leaps_active[sym] = True
                        else:
                            budget = min(per_ticker, available)
                            shares = int(budget * 0.80 / (price * (1 + SLIPPAGE)))
                            if shares < 1:
                                continue
                            cost = shares * price * (1 + SLIPPAGE)
                            if cost > available:
                                continue

                            cash -= cost
                            positions[sym] = {
                                "shares": shares,
                                "avg_price": price * (1 + SLIPPAGE),
                                "cost": cost,
                                "entry_date": dt,
                                "partial_exited": False,
                                "peak": price,
                                "leverage": 1.0,
                                "is_leaps": False,
                                "army": army_name,
                                "scales_done": 1,
                            }

                        monthly_trades[mk] += 1

        # ─── SCALE-IN ───
        for sym in list(positions.keys()):
            pos = positions[sym]
            if pos.get("partial_exited") or pos.get("scales_done", 1) >= 2:
                continue
            if pos.get("is_leaps"):
                continue

            price, sma = get_price(sym, current_date)
            if price is None:
                continue
            days = (dt - pos["entry_date"]).days
            if days < 3:
                continue

            pos_value = sum(
                positions[s]["shares"] * (get_price(s, current_date)[0] or 0)
                for s in positions
                if not positions[s].get("is_leaps")
            )
            leaps_value = sum(
                positions[s]["cost"]
                for s in positions
                if positions[s].get("is_leaps")
            )
            total = cash + pos_value + leaps_value
            available = cash - total * (MIN_CASH_PCT / 100)

            army_cfg = None
            for an, ac in ARMIES.items():
                if sym in ac["tickers"]:
                    army_cfg = ac
                    break
            if not army_cfg:
                continue

            per_ticker = total * army_cfg["allocation"] / len(army_cfg["tickers"])
            budget = min(per_ticker * 0.20, available)
            add_shares = int(budget / (price * (1 + SLIPPAGE)))

            if add_shares >= 1:
                cost = add_shares * price * (1 + SLIPPAGE)
                total_cost = pos["cost"] + cost
                total_shares = pos["shares"] + add_shares
                pos["avg_price"] = total_cost / total_shares
                pos["shares"] = total_shares
                pos["cost"] = total_cost
                pos["scales_done"] = 2
                cash -= cost

        # ─── LOG ───
        pos_value = sum(
            positions[s]["shares"] * (get_price(s, current_date)[0] or 0)
            for s in positions
            if not positions[s].get("is_leaps")
        )
        leaps_value = 0
        for s, p in positions.items():
            if p.get("is_leaps"):
                price, _ = get_price(s, current_date)
                if price:
                    pnl = price / p["avg_price"] - 1
                    leaps_value += p["cost"] * max(0.05, 1 + pnl * p["leverage"])

        total = cash + pos_value + leaps_value
        peak_portfolio = max(peak_portfolio, total)
        dd = (total - peak_portfolio) / peak_portfolio * 100
        max_dd = min(max_dd, dd)

    # Close remaining
    ref_sym = list(data.keys())[0]
    last_dates = [d.date() for d in data[ref_sym].index]
    last_date = last_dates[-1]

    for sym in list(positions.keys()):
        pos = positions[sym]
        price, _ = get_price(sym, last_date)
        if price:
            pnl = price / pos["avg_price"] - 1
            if pos.get("is_leaps"):
                option_value = pos["cost"] * max(0.05, 1 + pnl * pos["leverage"])
                proceeds = option_value * (1 - SLIPPAGE)
            else:
                proceeds = pos["shares"] * price * (1 - SLIPPAGE)

            cash += proceeds
            closed.append({
                "sym": sym, "entry": pos["avg_price"], "exit": price,
                "entry_date": pos["entry_date"].strftime("%Y-%m-%d"),
                "exit_date": last_date.isoformat(),
                "shares": pos["shares"], "pnl": proceeds - pos["cost"],
                "pnl_pct": (proceeds / pos["cost"] - 1) * 100,
                "reason": "STILL HELD",
                "army": pos.get("army", ""), "leaps": pos.get("is_leaps", False),
            })

    return cash, closed, max_dd


def run_benchmarks(data):
    all_tickers = set()
    for cfg in ARMIES.values():
        all_tickers.update(cfg["tickers"])
    all_tickers = list(all_tickers)

    n = len(all_tickers)
    per = STARTING_CAPITAL / n
    bh_total = 0
    for sym in all_tickers:
        if sym not in data:
            continue
        p0 = data[sym]["Close"].iloc[0]
        pN = data[sym]["Close"].iloc[-1]
        bh_total += (per / p0) * pN
    bh_return = (bh_total / STARTING_CAPITAL - 1) * 100

    spy_return = None
    try:
        spy = yf.Ticker("SPY").history(start=START_DATE, end=END_DATE, auto_adjust=True)
        if not spy.empty:
            spy_return = round((spy["Close"].iloc[-1] / spy["Close"].iloc[0] - 1) * 100, 2)
    except Exception:
        pass

    return bh_total, bh_return, spy_return


if __name__ == "__main__":
    cash, closed, max_dd = run_backtest(data)
    cs_return = (cash / STARTING_CAPITAL - 1) * 100
    bh_total, bh_return, spy_return = run_benchmarks(data)

    print("=" * 65)
    print("COSMIC SIGNAL — 5 ARMY + LEAPS BACKTEST (V5)")
    print(f"Period: {START_DATE} -> {END_DATE} | Starting: ${STARTING_CAPITAL:,.0f}")
    print("=" * 65)

    print(f"\nFinal Value:     ${cash:,.2f}")
    print(f"Total Return:    {cs_return:+.2f}%")
    print(f"Max Drawdown:    {max_dd:.1f}%")
    print(f"Total Trades:    {len(closed)}")

    wins = [t for t in closed if t["pnl"] > 0]
    losses = [t for t in closed if t["pnl"] <= 0]
    print(f"Win Rate:        {len(wins)}/{len(closed)} ({len(wins)/max(len(closed),1)*100:.0f}%)")

    if wins:
        avg_win = sum(t["pnl_pct"] for t in wins) / len(wins)
        best = max(wins, key=lambda t: t["pnl_pct"])
        print(f"Avg Win:         +{avg_win:.1f}%")
        tag = "LEAPS" if best["leaps"] else "STOCK"
        print(f"Best:            ${best['sym']} +{best['pnl_pct']:.1f}% [{tag}]")
    if losses:
        avg_loss = sum(t["pnl_pct"] for t in losses) / len(losses)
        worst = min(losses, key=lambda t: t["pnl_pct"])
        print(f"Avg Loss:        {avg_loss:.1f}%")
        print(f"Worst:           ${worst['sym']} {worst['pnl_pct']:.1f}%")

    total_wins = sum(t["pnl"] for t in wins) if wins else 0
    total_losses = abs(sum(t["pnl"] for t in losses)) if losses else 0.01
    print(f"Profit Factor:   {total_wins/total_losses:.2f}")
    if max_dd != 0:
        print(f"Return/MaxDD:    {abs(cs_return/max_dd):.2f}x")

    print(f"\nAll Trades:")
    for t in closed:
        arrow = "OK" if t["pnl"] > 0 else "XX"
        leaps_tag = " LEAPS" if t["leaps"] else ""
        line = (f"  {arrow} ${t['sym']:5s} | {t['entry_date']} -> {t['exit_date']} "
                f"| {t['pnl_pct']:+7.1f}% | ${t['pnl']:+10.2f} | "
                f"{t['army']}{leaps_tag} | {t['reason']}")
        print(line)

    print(f"\nBy Army:")
    armies = {}
    for t in closed:
        a = t["army"]
        if a not in armies:
            armies[a] = {"pnl": 0, "trades": 0, "wins": 0}
        armies[a]["pnl"] += t["pnl"]
        armies[a]["trades"] += 1
        if t["pnl"] > 0:
            armies[a]["wins"] += 1
    for a, s in armies.items():
        print(f"  {a:25s} | {s['trades']} trades, {s['wins']} wins | ${s['pnl']:+,.2f}")

    print(f"\nComparison:")
    print(f"  V1 (old rules):          +1.34%   ->  $5,067")
    print(f"  V3 (optimized):          +58.28%  ->  $7,914")
    print(f"  V4 (aggressive):         +117.56% ->  $10,878")
    print(f"  V5 (5-army + LEAPS):     {cs_return:+.2f}%  ->  ${cash:,.2f}")
    if bh_return is not None:
        print(f"  Buy & Hold (all tickers): {bh_return:+.2f}% ->  ${bh_total:,.2f}")
    if spy_return is not None:
        print(f"  SPY Buy & Hold:           {spy_return:+.2f}%")

    print(f"\nPath to $200K:")
    print(f"  Current trajectory: ${cash:,.0f} at 16 months")
    remaining_months = 8
    remaining_target = 200000
    monthly_needed = (remaining_target / cash) ** (1 / remaining_months)
    print(f"  Need {monthly_needed:.2f}x/month for next {remaining_months} months")
    print(f"  That's {(monthly_needed-1)*100:.0f}%/month compounding")
