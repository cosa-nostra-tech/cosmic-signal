#!/usr/bin/env python3
"""
COSMIC SIGNAL — Backtest Engine
Simulates trading Cosmic Signal recommendations from Trump 2.0 inauguration (Jan 20, 2025).
Starting capital: $5,000 USD.
Applies all trading rules mechanically: entry zones, scale-in, time stops, thesis breaks, position limits.
"""

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json
import sys

# ─── CONFIG ───
START_DATE = "2025-01-20"  # Trump inauguration
END_DATE = "2026-05-09"    # Latest trading day
STARTING_CAPITAL = 5000.0

# Trading rules from Cosmic Signal
MAX_TRADES_PER_MONTH = 3
MAX_OPEN_POSITIONS = 5
MAX_PORTFOLIO_RISK_PCT = 15  # thematic = max 15% of total capital
MIN_CASH_PCT = 20  # keep 20%+ in cash
SCALE_IN = [0.40, 0.30, 0.30]  # entry 1, 2, 3
TIME_STOP_DAYS = 90
TIME_STOP_THRESHOLD = 0.10  # if no 10%+ move in 90 days, exit half
THESIS_BREAK_EXIT = True

# ─── TICKER UNIVERSE WITH ENTRY/EXIT RULES ───
TICKERS = {
    # AI: THE SUPPLY CHAIN OF GOD
    "UEC": {
        "theme": "ai-upstream",
        "name": "Uranium Energy Corp",
        "buy_zone": (14.00, 16.00),
        "target": 28.0,
        "max_position_pct": 3,
        "risk": "high",
        "entry_trigger": "uranium_spot_above_85",  # approximate with price action
    },
    "UUUU": {
        "theme": "ai-upstream",
        "name": "Energy Fuels",
        "buy_zone": (18.00, 22.00),
        "target": 35.0,
        "max_position_pct": 3,
        "risk": "high",
        "entry_trigger": "china_ree_or_uranium",
    },
    "NNE": {
        "theme": "ai-upstream",
        "name": "NANO Nuclear",
        "buy_zone": (24.00, 30.00),
        "target": 50.0,
        "max_position_pct": 2,
        "risk": "very_high",
        "entry_trigger": "smr_announcement",
    },
    "MP": {
        "theme": "ai-upstream",
        "name": "MP Materials",
        "buy_zone": (55.00, 67.00),
        "target": 100.0,
        "max_position_pct": 4,
        "risk": "medium",
        "entry_trigger": "china_ree_export",
    },
    "VRT": {
        "theme": "ai-upstream",
        "name": "Vertiv Holdings",
        "buy_zone": (280.00, 345.00),
        "target": 450.0,
        "max_position_pct": 5,
        "risk": "medium",
        "entry_trigger": "liquid_cooling_deployment",
    },
    "MRVL": {
        "theme": "ai-upstream",
        "name": "Marvell Technology",
        "buy_zone": (140.00, 170.00),
        "target": 200.0,
        "max_position_pct": 5,
        "risk": "medium",
        "entry_trigger": "asic_partnership",
    },
    # CONFLICT: THE AGE OF DISORDER
    "TDG": {
        "theme": "conflict-volatility",
        "name": "TransDigm Group",
        "buy_zone": (1100.00, 1220.00),
        "target": 1600.0,
        "max_position_pct": 5,
        "risk": "low",
        "entry_trigger": "european_procurement",
    },
    "LHX": {
        "theme": "conflict-volatility",
        "name": "L3Harris Technologies",
        "buy_zone": (260.00, 305.00),
        "target": 380.0,
        "max_position_pct": 4,
        "risk": "medium",
        "entry_trigger": "nato_c4isr",
    },
    "CAT": {
        "theme": "conflict-volatility",
        "name": "Caterpillar",
        "buy_zone": (800.00, 910.00),
        "target": 1050.0,
        "max_position_pct": 5,
        "risk": "low",
        "entry_trigger": "reshoring_announcement",
    },
    # DE-DOLLARIZATION: THE EXODUS FROM BABEL
    "GDXJ": {
        "theme": "de-dollarization",
        "name": "Junior Gold Miners ETF",
        "buy_zone": (110.00, 128.00),
        "target": 180.0,
        "max_position_pct": 4,
        "risk": "high",
        "entry_trigger": "gold_ath_or_cb_buying",
    },
    "WPM": {
        "theme": "de-dollarization",
        "name": "Wheaton Precious Metals",
        "buy_zone": (120.00, 140.00),
        "target": 180.0,
        "max_position_pct": 5,
        "risk": "low",
        "entry_trigger": "gold_ath",
    },
    "SLV": {
        "theme": "de-dollarization",
        "name": "iShares Silver Trust",
        "buy_zone": (60.00, 75.00),
        "target": 100.0,
        "max_position_pct": 3,
        "risk": "medium",
        "entry_trigger": "gold_silver_ratio",
    },
}


class Position:
    def __init__(self, symbol, theme, entry_date, shares, entry_price, scale_entry, max_pos_pct):
        self.symbol = symbol
        self.theme = theme
        self.entry_date = entry_date
        self.shares = shares
        self.entry_price = entry_price
        self.scale_entry = scale_entry  # 0, 1, 2 for scale-in entries
        self.max_pos_pct = max_pos_pct
        self.remaining_scales = list(SCALE_IN[scale_entry + 1:])  # future scale-ins
        self.exit_date = None
        self.exit_price = None
        self.exit_reason = None
        self.cost_basis = shares * entry_price
    
    def add_scale(self, shares, price, scale_idx):
        self.shares += shares
        self.cost_basis += shares * price
        self.entry_price = self.cost_basis / self.shares  # average
        self.remaining_scales = list(SCALE_IN[scale_idx + 1:])
    
    def market_value(self, current_price):
        return self.shares * current_price
    
    def pnl(self, current_price):
        return self.market_value(current_price) - self.cost_basis
    
    def pnl_pct(self, current_price):
        if self.cost_basis == 0:
            return 0
        return (current_price / self.entry_price - 1) * 100
    
    def days_held(self, current_date):
        return (current_date - self.entry_date).days
    
    def is_partial_exit(self):
        return self.exit_reason and "partial" in self.exit_reason.lower()


def fetch_all_prices():
    """Fetch daily OHLCV for all tickers."""
    print("Fetching price data...", file=sys.stderr)
    symbols = list(TICKERS.keys())
    all_data = {}
    
    for sym in symbols:
        try:
            t = yf.Ticker(sym)
            df = t.history(start=START_DATE, end=END_DATE, auto_adjust=True)
            if not df.empty:
                all_data[sym] = df
                print(f"  {sym}: {len(df)} days, ${df['Close'].iloc[0]:.2f} → ${df['Close'].iloc[-1]:.2f}", file=sys.stderr)
            else:
                print(f"  {sym}: NO DATA", file=sys.stderr)
        except Exception as e:
            print(f"  {sym}: ERROR - {e}", file=sys.stderr)
    
    return all_data


def fetch_vix():
    """Fetch VIX for regime classification."""
    try:
        t = yf.Ticker("^VIX")
        df = t.history(start=START_DATE, end=END_DATE)
        return df
    except:
        return None


def run_backtest():
    prices = fetch_all_prices()
    vix_data = fetch_vix()
    
    if not prices:
        print("ERROR: No price data fetched", file=sys.stderr)
        return
    
    # Get all trading dates
    all_dates = set()
    for sym, df in prices.items():
        for d in df.index:
            all_dates.add(d.date())
    all_dates = sorted(all_dates)
    
    # ─── STATE ───
    cash = STARTING_CAPITAL
    positions = {}  # symbol -> Position
    closed_trades = []
    monthly_trades = {}  # YYYY-MM -> count
    portfolio_log = []
    
    # ─── SIMULATION LOOP ───
    for current_date in all_dates:
        dt = datetime(current_date.year, current_date.month, current_date.day)
        month_key = dt.strftime("%Y-%m")
        if month_key not in monthly_trades:
            monthly_trades[month_key] = 0
        
        # Get VIX for regime
        vix_val = None
        if vix_data is not None:
            try:
                vix_row = vix_data.loc[vix_data.index.date == current_date]
                if not vix_row.empty:
                    vix_val = vix_row['Close'].iloc[0]
            except:
                pass
        
        # ─── CHECK EXITS FIRST ───
        symbols_to_check = list(positions.keys())
        for sym in symbols_to_check:
            pos = positions[sym]
            if sym not in prices:
                continue
            df = prices[sym]
            try:
                row = df.loc[df.index.date == current_date]
                if row.empty:
                    continue
                current_price = row['Close'].iloc[0]
            except:
                continue
            
            days = pos.days_held(dt)
            pnl_pct = pos.pnl_pct(current_price)
            
            # EXIT RULE 1: Thesis break — price drops >20% from entry
            if pnl_pct < -20:
                exit_value = pos.market_value(current_price)
                cash += exit_value * 0.998  # 0.2% slippage
                pos.exit_date = current_date
                pos.exit_price = current_price
                pos.exit_reason = f"THESIS BREAK: down {pnl_pct:.1f}%"
                closed_trades.append(pos)
                del positions[sym]
                continue
            
            # EXIT RULE 2: Target hit — sell 50%, trail the rest
            if current_price >= pos.entry_price * 1.30 and not pos.is_partial_exit():
                # Sell half
                half_shares = pos.shares // 2
                if half_shares > 0:
                    exit_value = half_shares * current_price * 0.998
                    cash += exit_value
                    pos.shares -= half_shares
                    pos.cost_basis -= (pos.cost_basis / (pos.shares + half_shares)) * half_shares
                    pos.exit_reason = f"PARTIAL: target hit at +{pnl_pct:.1f}%"
                    pos.peak_after_target = current_price  # track peak for trailing stop
            
            # EXIT RULE 2b: Trailing stop after partial exit (15% from peak)
            if pos.is_partial_exit():
                if not hasattr(pos, 'peak_after_target'):
                    pos.peak_after_target = current_price
                pos.peak_after_target = max(pos.peak_after_target, current_price)
                if current_price < pos.peak_after_target * 0.85:
                    exit_value = pos.market_value(current_price) * 0.998
                    cash += exit_value
                    pos.exit_date = current_date
                    pos.exit_price = current_price
                    pos.exit_reason = f"TRAILING STOP: dropped 15% from peak ${pos.peak_after_target:.2f}"
                    closed_trades.append(pos)
                    del positions[sym]
                    continue
            
            # EXIT RULE 3: Time stop — 90 days with no 10%+ move → exit half
            if days >= TIME_STOP_DAYS and abs(pnl_pct) < TIME_STOP_THRESHOLD * 100:
                half_shares = pos.shares // 2
                if half_shares > 0 and not pos.is_partial_exit():
                    exit_value = half_shares * current_price * 0.998
                    cash += exit_value
                    pos.shares -= half_shares
                    pos.cost_basis -= (pos.cost_basis / (pos.shares + half_shares)) * half_shares
                    pos.exit_reason = f"TIME STOP: {days} days, only {pnl_pct:.1f}% move"
            
            # EXIT RULE 4: Max hold period — 18 months (540 days)
            if days >= 540:
                exit_value = pos.market_value(current_price) * 0.998
                cash += exit_value
                pos.exit_date = current_date
                pos.exit_price = current_price
                pos.exit_reason = f"MAX HOLD: {days} days"
                closed_trades.append(pos)
                del positions[sym]
        
        # ─── CHECK ENTRIES ───
        # Skip if VIX > 30 (risk-off, no new entries per symphony logic)
        if vix_val and vix_val > 30:
            continue
        
        # Skip if monthly trade limit reached
        if monthly_trades[month_key] >= MAX_TRADES_PER_MONTH:
            continue
        
        # Skip if max positions reached
        if len(positions) >= MAX_OPEN_POSITIONS:
            continue
        
        # Check if we have enough cash (20% reserve)
        total_in_positions = sum(
            pos.market_value(prices[sym].loc[prices[sym].index.date == current_date, 'Close'].iloc[0])
            if sym in prices and not prices[sym].loc[prices[sym].index.date == current_date].empty
            else 0
            for sym in positions
        )
        total_portfolio = cash + total_in_positions
        min_cash_reserve = total_portfolio * (MIN_CASH_PCT / 100)
        max_thematic = total_portfolio * (MAX_PORTFOLIO_RISK_PCT / 100)
        
        if cash <= min_cash_reserve:
            continue
        
        # Check each ticker for entry
        for sym, config in TICKERS.items():
            if sym in positions:
                continue  # already holding
            if sym not in prices:
                continue
            if monthly_trades[month_key] >= MAX_TRADES_PER_MONTH:
                break
            if len(positions) >= MAX_OPEN_POSITIONS:
                break
            
            df = prices[sym]
            try:
                row = df.loc[df.index.date == current_date]
                if row.empty:
                    continue
                current_price = row['Close'].iloc[0]
            except:
                continue
            
            buy_low, buy_high = config["buy_zone"]
            max_pos_pct = config["max_position_pct"]
            
            # ENTRY CHECK: Is price in buy zone?
            if not (buy_low <= current_price <= buy_high):
                continue
            
            # POSITION SIZING: max_position_pct of total portfolio
            position_budget = min(
                total_portfolio * (max_pos_pct / 100),
                cash - min_cash_reserve,
                max_thematic - total_in_positions,  # don't exceed thematic limit
            )
            
            if position_budget < current_price * 1:  # can't afford even 1 share scale-in
                continue
            
            # SCALE IN: First entry = 40% of planned position
            first_scale_shares = int(position_budget * SCALE_IN[0] / current_price)
            if first_scale_shares < 1:
                continue
            
            cost = first_scale_shares * current_price * 1.002  # 0.2% slippage
            if cost > cash - min_cash_reserve:
                first_scale_shares = int((cash - min_cash_reserve) / (current_price * 1.002))
                cost = first_scale_shares * current_price * 1.002
                if first_scale_shares < 1:
                    continue
            
            cash -= cost
            positions[sym] = Position(
                symbol=sym,
                theme=config["theme"],
                entry_date=dt,
                shares=first_scale_shares,
                entry_price=current_price * 1.002,  # include slippage
                scale_entry=0,
                max_pos_pct=max_pos_pct,
            )
            monthly_trades[month_key] += 1
        
        # ─── SCALE-IN CHECK ───
        for sym, pos in list(positions.items()):
            if not pos.remaining_scales:
                continue
            if sym not in prices:
                continue
            try:
                row = prices[sym].loc[prices[sym].index.date == current_date]
                if row.empty:
                    continue
                current_price = row['Close'].iloc[0]
            except:
                continue
            
            # Scale in on pullback (price drops 3-5% from previous entry) 
            # or after 5+ trading days in position
            days = pos.days_held(dt)
            
            # Get config
            config = TICKERS.get(sym)
            if not config:
                continue
            
            buy_low, buy_high = config["buy_zone"]
            if not (buy_low <= current_price <= buy_high):
                continue
            
            # Check if we should scale in (5+ days since last entry)
            if days >= 5 * (1 + 2 - len(pos.remaining_scales)):  # stagger entries
                next_scale_idx = 3 - len(pos.remaining_scales)
                scale_pct = pos.remaining_scales[0]
                
                total_in_positions_now = sum(
                    p.market_value(prices[s].loc[prices[s].index.date == current_date, 'Close'].iloc[0])
                    if s in prices and not prices[s].loc[prices[s].index.date == current_date].empty
                    else 0
                    for s, p in positions.items()
                )
                total_portfolio_now = cash + total_in_positions_now
                position_budget = min(
                    total_portfolio_now * (pos.max_pos_pct / 100),
                    cash - total_portfolio_now * (MIN_CASH_PCT / 100),
                )
                
                add_shares = int(position_budget * scale_pct / current_price)
                if add_shares < 1:
                    continue
                
                cost = add_shares * current_price * 1.002
                if cost > cash - total_portfolio_now * (MIN_CASH_PCT / 100):
                    add_shares = int((cash - total_portfolio_now * (MIN_CASH_PCT / 100)) / (current_price * 1.002))
                    cost = add_shares * current_price * 1.002
                    if add_shares < 1:
                        continue
                
                cash -= cost
                pos.add_scale(add_shares, current_price * 1.002, next_scale_idx)
        
        # ─── LOG PORTFOLIO STATE ───
        total_in_pos = 0
        for sym, pos in positions.items():
            if sym in prices:
                try:
                    row = prices[sym].loc[prices[sym].index.date == current_date]
                    if not row.empty:
                        total_in_pos += pos.market_value(row['Close'].iloc[0])
                except:
                    pass
        
        portfolio_log.append({
            "date": current_date.isoformat(),
            "cash": round(cash, 2),
            "positions_value": round(total_in_pos, 2),
            "total": round(cash + total_in_pos, 2),
            "num_positions": len(positions),
            "vix": round(vix_val, 2) if vix_val else None,
        })
    
    # ─── CLOSE REMAINING POSITIONS AT END ───
    for sym, pos in list(positions.items()):
        if sym in prices:
            df = prices[sym]
            last_price = df['Close'].iloc[-1]
            last_date = df.index[-1].date()
            exit_value = pos.market_value(last_price) * 0.998
            cash += exit_value
            pos.exit_date = last_date
            pos.exit_price = last_price
            pos.exit_reason = "END OF BACKTEST"
            closed_trades.append(pos)
    
    # ─── RESULTS ───
    final_total = cash
    
    return {
        "starting_capital": STARTING_CAPITAL,
        "final_value": round(final_total, 2),
        "total_return_pct": round((final_total / STARTING_CAPITAL - 1) * 100, 2),
        "total_trades": len(closed_trades),
        "closed_trades": [
            {
                "symbol": t.symbol,
                "theme": t.theme,
                "entry_date": t.entry_date.strftime("%Y-%m-%d"),
                "exit_date": t.exit_date.isoformat() if t.exit_date else "OPEN",
                "entry_price": round(t.entry_price, 2),
                "exit_price": round(t.exit_price, 2) if t.exit_price else None,
                "shares": t.shares,
                "pnl": round(t.pnl(t.exit_price) if t.exit_price else 0, 2),
                "pnl_pct": round(t.pnl_pct(t.exit_price) if t.exit_price else 0, 2),
                "exit_reason": t.exit_reason,
            }
            for t in closed_trades
        ],
        "monthly_trades": monthly_trades,
        "portfolio_log_sample": portfolio_log[::5],  # every 5th day for brevity
    }


if __name__ == "__main__":
    results = run_backtest()
    print(json.dumps(results, indent=2))
