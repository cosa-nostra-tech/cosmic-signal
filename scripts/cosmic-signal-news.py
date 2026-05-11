#!/usr/bin/env python3
"""
cosmic-signal-news.py — Daily news gatherer for Cosmic Signal thematic editions.

For each theme, searches disparate sources (mainstream news, alternative media,
Reddit/social, official government/regulatory, research/analysis) and produces
a NewsItem array that gets injected into the latest edition markdown.

Designed to run as a Hermes cron job (no interactive input needed).
Output: YAML snippet that the cron prompt merges into the edition file.

Usage:
  python3 scripts/cosmic-signal-news.py [--edition PATH] [--max-per-theme N]
"""

import argparse
import datetime
import json
import os
import re
import subprocess
import sys
import yaml
from pathlib import Path

# ─── Theme search configurations ───

THEME_SEARCH_CONFIG = {
    "ai-upstream": {
        "name": "AI Supply Chain",
        "searches": [
            # Mainstream
            {"query": "uranium nuclear data center power demand 2026", "source_type": "mainstream", "max": 2},
            {"query": "copper supply deficit AI infrastructure 2026", "source_type": "mainstream", "max": 1},
            {"query": "rare earth gallium germanium export controls China", "source_type": "official", "max": 1},
            # Alternative / niche
            {"query": "uranium junior miners supply shortage nuclear renaissance", "source_type": "alternative", "max": 2},
            {"query": "data center cooling power bottleneck GPU chips", "source_type": "research", "max": 1},
            # Social
            {"query": "site:reddit.com uranium stocks nuclear investing", "source_type": "social", "max": 1},
        ],
        "tickers": ["UEC", "UUUU", "MP", "COPP", "VRT", "NNE", "IE"],
    },
    "conflict-volatility": {
        "name": "Conflict / Volatility",
        "searches": [
            {"query": "European rearmament defense spending Poland NATO 2026", "source_type": "mainstream", "max": 2},
            {"query": "tariff executive order China electronics trade war", "source_type": "official", "max": 1},
            {"query": "defense industrial base reshoring manufacturing aerospace", "source_type": "research", "max": 1},
            {"query": "shadow fleet sanctions Iran oil OFAC", "source_type": "alternative", "max": 1},
            {"query": "VIX volatility geopolitical risk market", "source_type": "research", "max": 1},
            {"query": "site:reddit.com defense stocks LHX TDG aerospace investing", "source_type": "social", "max": 1},
        ],
        "tickers": ["TDG", "LHX", "CAT", "NOC", "LMT"],
    },
    "de-dollarization": {
        "name": "De-Dollarization",
        "searches": [
            {"query": "central bank gold buying reserves PBOC 2026", "source_type": "mainstream", "max": 2},
            {"query": "BRICS settlement RMB yuan clearing SWIFT alternative", "source_type": "alternative", "max": 1},
            {"query": "treasury auction foreign demand bid cover weak", "source_type": "mainstream", "max": 1},
            {"query": "petroyuan Saudi Arabia yuan bond oil trade", "source_type": "research", "max": 1},
            {"query": "gold price breakout $3000 $4000 reserves", "source_type": "alternative", "max": 1},
            {"query": "site:reddit.com gold stacking precious metals de-dollarization", "source_type": "social", "max": 1},
        ],
        "tickers": ["GDXJ", "UUUU", "GLD"],
    },
}

SIGNAL_CLASSIFICATION = {
    # Keywords that make a headline a "strong" signal for the thesis
    "strong": ["breaks", "record", "surge", "crisis", "critical", "shortage", "deficit", "war", "sanctions expand", "executive order", "breakout"],
    "moderate": ["rising", "accelerating", "shift", "policy change", "rearmament", "tariff", "new contract", "expansion"],
    "weak": ["gradual", "slight", "modest", "potential", "expected", "planned"],
    "noise": ["opinion", "debate", "overextended", "bubble", "reddit", "thread", "discussion"],
}

SENTIMENT_CLASSIFICATION = {
    "bullish": ["breaks", "surge", "record", "accelerating", "expansion", "buying", "growth", "bullish"],
    "bearish": ["weak", "cuts", "deficit", "crisis", "shortage", "collapse", "sanctions"],
    "contrarian": ["overextended", "bubble", "dismissing", "contrarian", "undervalued", "early innings"],
    "neutral": ["modest", "gradual", "steady", "stable", "shift", "ongoing"],
}


def classify_signal(headline: str) -> str:
    """Classify signal strength from headline keywords."""
    hl_lower = headline.lower()
    for level, keywords in SIGNAL_CLASSIFICATION.items():
        for kw in keywords:
            if kw in hl_lower:
                return level
    return "moderate"


def classify_sentiment(headline: str) -> str:
    """Classify sentiment from headline keywords."""
    hl_lower = headline.lower()
    for sentiment, keywords in SENTIMENT_CLASSIFICATION.items():
        for kw in keywords:
            if kw in hl_lower:
                return sentiment
    return "neutral"


def extract_tickers(text: str, theme_tickers: list[str]) -> list[str]:
    """Find which theme tickers are mentioned in the text."""
    found = []
    for t in theme_tickers:
        if re.search(r'\b' + t + r'\b', text, re.IGNORECASE):
            found.append(t)
    return found


def search_web(query: str, max_results: int = 5) -> list[dict]:
    """Use web_search tool to find articles."""
    # We'll use subprocess to call the hermes search tool
    # In cron context, this runs as a script that outputs context
    # The actual search will be done by the LLM in the cron prompt
    # This function is a placeholder — the real search happens at the LLM level
    return []


def build_news_yaml(theme_id: str, news_items: list[dict]) -> str:
    """Build YAML snippet for news items."""
    if not news_items:
        return ""
    items_yaml = yaml.dump(news_items, default_flow_style=False, allow_unicode=True, sort_keys=False)
    return items_yaml


def get_today_iso() -> str:
    return datetime.date.today().isoformat()


def main():
    parser = argparse.ArgumentParser(description="Gather news for Cosmic Signal editions")
    parser.add_argument("--edition", default=None, help="Path to edition markdown file")
    parser.add_argument("--max-per-theme", type=int, default=5, help="Max news items per theme")
    parser.add_argument("--output", default=None, help="Output file path (default: stdout)")
    args = parser.parse_args()

    today = get_today_iso()
    output = {}

    for theme_id, config in THEME_SEARCH_CONFIG.items():
        theme_news = []
        for search in config["searches"]:
            # Build search description for the LLM to execute
            theme_news.append({
                "_search_query": search["query"],
                "_source_type": search["source_type"],
                "_max_results": search["max"],
                "_theme_tickers": config["tickers"],
            })
        output[theme_id] = theme_news

    # Output as JSON for the cron prompt to consume
    result = json.dumps({
        "date": today,
        "themes": output,
        "signal_keywords": SIGNAL_CLASSIFICATION,
        "sentiment_keywords": SENTIMENT_CLASSIFICATION,
    }, indent=2)

    if args.output:
        Path(args.output).write_text(result)
    else:
        print(result)


if __name__ == "__main__":
    main()