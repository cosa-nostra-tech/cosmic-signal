#!/usr/bin/env python3
"""HN Algolia search helper"""
import sys
import json
import urllib.request

query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "AI"
url = f"https://hn.algolia.com/api/v1/search?query={urllib.parse.quote(query)}&tags=story&hitsPerPage=8"

req = urllib.request.Request(url, headers={"User-Agent": "CosmicSignal/1.0"})

try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
    
    results = []
    for hit in data.get("hits", []):
        results.append({
            "title": hit.get("title", ""),
            "url": hit.get("url", "") or f"https://news.ycombinator.com/item?id={hit.get('objectID','')}",
            "date": hit.get("created_at", "")[:10],
            "points": hit.get("points", 0),
        })
    print(json.dumps(results, indent=2))
except Exception as e:
    print(json.dumps({"error": str(e)}))
