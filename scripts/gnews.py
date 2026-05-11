#!/usr/bin/env python3
"""Google News RSS search - fetches and parses results to JSON"""
import sys
import json
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET

query = sys.argv[1] if len(sys.argv) > 1 else "test"
url = f"https://news.google.com/rss/search?q={urllib.parse.quote(query)}&hl=en-US&gl=US&ceid=US:en"

req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"})

try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = resp.read().decode("utf-8", errors="replace")
    
    root = ET.fromstring(data)
    items = []
    for item in root.findall('.//item')[:8]:
        title_el = item.find('title')
        link_el = item.find('link')
        pubdate_el = item.find('pubDate')
        title = title_el.text if title_el is not None else ''
        link = link_el.text if link_el is not None else ''
        pubdate = pubdate_el.text if pubdate_el is not None else ''
        items.append({'title': title, 'url': link, 'date': pubdate})
    
    print(json.dumps(items, indent=2, ensure_ascii=False))
except Exception as e:
    print(json.dumps({"error": str(e)}))
