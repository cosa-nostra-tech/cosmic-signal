#!/usr/bin/env python3
"""Fix the edition YAML by removing orphaned lines after portfolio_target."""
import re

with open('data/editions/001-2026-05-10.md', 'r') as f:
    content = f.read()

lines = content.split('\n')

# Strategy: find the portfolio_target section, keep only its proper children
# Remove any orphaned exit_signal line that follows it
clean_lines = []
in_portfolio = False
orphan_removed = False

for i, line in enumerate(lines):
    stripped = line.strip()
    
    # Detect portfolio_target section
    if stripped.startswith('portfolio_target:'):
        in_portfolio = True
        clean_lines.append(line)
        continue
    
    if in_portfolio:
        # Proper children are indented under portfolio_target
        if line.startswith('  ') and stripped and not stripped.startswith('#'):
            clean_lines.append(line)
            continue
        elif not stripped:
            # blank line - could be end of section
            in_portfolio = False
            # But check if next non-blank line is still indented (part of portfolio)
            clean_lines.append(line)
            continue
        elif stripped.startswith('exit_signal') and not orphan_removed:
            # This is the orphaned line from the SLV ticker that got detached
            orphan_removed = True
            # Re-attach it to the SLV ticker above by finding where it should go
            # Actually, the exit_signal belongs to the SLV ticker in the de-dollarization theme
            # Let's skip it for now since it's already in the trade_rules section
            continue
        else:
            in_portfolio = False
    
    clean_lines.append(line)

with open('data/editions/001-2026-05-10.md', 'w') as f:
    f.write('\n'.join(clean_lines))

print(f"Cleaned: {len(lines)} -> {len(clean_lines)} lines, orphan removed: {orphan_removed}")
