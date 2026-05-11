#!/usr/bin/env python3
"""Search helper using DuckDuckGo HTML"""
import sys
import re
import json
import urllib.request
import urllib.parse

query = sys.argv[1] if len(sys.argv) > 1 else "test"
url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"

req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        html = resp.read().decode("utf-8", errors="replace")
    
    # Extract result links and snippets
    results = []
    # DDG HTML results have result__url and result__snippet classes
    urls = re.findall(r'class="result__url"[^>]*>([^<]+)<', html)
    snippets = re.findall(r'class="result__snippet"[^>]*>([^<]+)<', html)
    titles = re.findall(r'class="result__title"[^>]*>.*?<a[^>]*>([^<]+)<', html)
    
    for i in range(min(len(urls), len(titles), 5)):
        results.append({
            "title": titles[i].strip() if i < len(titles) else "",
            "url": urls[i].strip() if i < len(urls) else "",
            "snippet": snippets[i].strip() if i < len(snippets) else ""
        })
    
    print(json.dumps(results, indent=2))
except Exception as e:
    print(json.dumps({"error": str(e)}))