# Cosmic Signal — Cinematic Visual Redesign

## Project Overview
Thematic investment research newsletter. Next.js static site deployed to Cloudflare Pages.
Path: ~/projects/cosmic-signal
Data types are in `src/lib/editions.ts` — DO NOT CHANGE types.
Edition data is in `data/editions/` — DO NOT CHANGE data.

## Design Direction: Cinematic + Glassmorphic
Reference: builders-club.com — full-viewport video walls, blend-mode text, minimal chrome, cinematic feel.
This is NOT a Bloomberg Terminal. This is a cinematic editorial experience with data overlay.

## Visual Language

### Color Palette
- **Base black**: #0a0a0a (pure black for video backgrounds)
- **Surface**: rgba(255,255,255,0.05) (barely visible white for subtle borders)
- **Glass card**: rgba(255,255,255,0.08) with backdrop-filter: blur(20px) and 1px rgba(255,255,255,0.12) border
- **Glass card hover**: rgba(255,255,255,0.14) with backdrop-filter: blur(30px)
- **Primary text**: #ffffff (white, but with mix-blend-mode: difference for video overlap)
- **Secondary text**: rgba(255,255,255,0.6)
- **Accent orange**: #ff8c00 (for active states, signal indicators)
- **Bull green**: #00e676
- **Bear red**: #ff1744
- **Signal dot colors**: match current army colors but muted

### Typography
- **Display/Headings**: Use system serif stack: `'Georgia', 'Times New Roman', serif` — elegant, editorial, contrasts with tech content
  - Hero title: clamp(3rem, 8vw, 7rem), letter-spacing: -0.03em, font-weight: 400
  - Section titles: clamp(2rem, 5vw, 4rem)
  - Subsection: clamp(1.2rem, 2vw, 1.8rem)
- **Body/Data**: `'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace`
  - Card data: 0.85rem
  - Labels: 0.7rem, uppercase, letter-spacing: 0.1em, rgba(255,255,255,0.4)
- **Mix-blend-mode: difference** on ALL text that overlays video — this makes white text invert to black on bright footage areas, ensuring constant readability

### Glassmorphic Card Specification
```css
.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;
}
.glass-card:hover {
  background: rgba(255, 255, 255, 0.14);
  backdrop-filter: blur(30px);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}
```

## Video Assets (Free stock from Mixkit.co — CC0 license)

### AI Supply Chain Theme
Primary: https://assets.mixkit.co/videos/23378/23378-720.mp4 (industrial)
Secondary: https://assets.mixkit.co/videos/14051/14051-720.mp4 (factory smoke)
Tertiary: https://assets.mixkit.co/videos/23282/23282-720.mp4 (data center)

### Conflict/Volatility Theme
Primary: https://assets.mixkit.co/videos/22232/22232-720.mp4 (military)
Secondary: https://assets.mixkit.co/videos/48288/48288-720.mp4 (explosion)
Tertiary: https://assets.mixkit.co/videos/22181/22181-720.mp4 (tank)

### De-Dollarization Theme
Primary: https://assets.mixkit.co/videos/38406/38406-720.mp4 (gold)
Secondary: https://assets.mixkit.co/videos/45703/45703-720.mp4 (money)
Tertiary: https://assets.mixkit.co/videos/22168/22168-720.mp4 (coins)

### Hero Section
Primary: https://assets.mixkit.co/videos/36318/36318-720.mp4 (dark industrial)

## Page Layout (Full Cinematic Scroll)

### Section 1: Hero (100vh)
- Full-viewport video background (dark industrial, autoplay/loop/muted)
- Dark overlay: rgba(0,0,0,0.4)
- "COSMIC SIGNAL" in serif, massive, centered, mix-blend-mode: difference
- Subtitle: "THEMATIC INTELLIGENCE FOR ASYMMETRIC RETURNS"
- Small scroll indicator at bottom (animated chevron)
- ISO date + edition number top-left in monospace
- No visible navigation chrome

### Section 2: Regime Dashboard (100vh)
- Video background continues or transitions to dark gradient
- Glass panel centered: "REGIME STATUS"
- Bull/Bear indicators as glowing dots
- VIX, DXY, Gold, S&P values in glass cards
- Minimal — just the macro picture, cinematic feel

### Section 3: AI Supply Chain Theme Wall (100vh+)
- Full-viewport video background (industrial footage)
- Theme title in massive serif with mix-blend-mode: difference: "AI: THE SUPPLY CHAIN OF GOD"
- Theme summary as editorial paragraph overlay
- Chokepoint severity as floating pills (CRITICAL = orange dot + label, HIGH = yellow, RISING = dim)
- **Stock cards**: 2-column grid of glassmorphic cards
  Each card shows:
  - Symbol (large, monospace) + Company name (small, serif)
  - Category tag (small pill)
  - Thesis (2-line clamp)
  - Current price → Target price range
  - Potential return (color-coded)
  - Risk level indicator
  - On hover: card brightens, shows entry trigger + exit signal

### Section 4: Conflict/Volatility Theme Wall (100vh+)
- Same structure as Section 3 but with military/explosion video background
- Title: "CONFLICT: THE AGE OF DISORDER"
- Same glassmorphic card grid for TDG, LHX, CAT

### Section 5: De-Dollarization Theme Wall (100vh+)
- Same structure but with gold/money video background
- Title: "DE-DOLLARIZATION: THE EXODUS FROM BABEL"
- Same glassmorphic card grid for GDXJ, WPM, SLV

### Section 6: Symphony Panel (100vh+)
- Dark background (no video, or very subtle particle animation)
- Three symphony panels (one per theme) as tall glass cards
- IF/THEN conditions rendered as a decision tree:
  - MET conditions: green left border, white text
  - NOT_MET conditions: dim, red left border
  - Current values in monospace
  - Status indicators (running/paused/halted)
- Default action highlighted at bottom of each panel

### Section 7: Cross-Theme Signals
- Dark background
- Signal excerpts as editorial blockquotes in glass cards
- Source attribution as small links

### Section 8: Trading Rules
- Dark background
- Rules as a minimal glass panel with key stats
- Portfolio risk, max positions, timing rules

### Section 9: Footer
- Minimal. Just "COSMIC SIGNAL" + date + "Asymmetric thematic intelligence"
- No status dots, no chrome

## Component Architecture

Rewrite ALL components. Delete anything that doesn't fit the cinematic vision.

```
src/app/page.tsx         — Full cinematic scroll layout (no sidebar, no grid panels)
src/app/globals.css      — New design system (see below)
src/components/HeroSection.tsx       — Full-viewport video hero
src/components/RegimeWall.tsx        — 100vh regime dashboard with glass cards
src/components/ThemeWall.tsx         — Reusable: video bg + title + chokepoint pills + stock cards
src/components/StockCard.tsx         — Single glassmorphic stock card
src/components/SymphonyWall.tsx      — Symphony conditions as glass decision trees
src/components/CrossSignalsWall.tsx  — Cross-theme signals as editorial quotes
src/components/RulesWall.tsx         — Trading rules as minimal glass panel
src/components/FooterSection.tsx     — Minimal footer
```

DELETE these old components (they are Bloomberg-era and won't be used):
- Header.tsx (no command bar in cinematic version)
- ArmyDashboard.tsx (replaced by ThemeWall + StockCard)
- TradingRulesSection.tsx (replaced by RulesWall)
- RegimeDashboard.tsx (replaced by RegimeWall)
- ThemeSection.tsx (replaced by ThemeWall)
- CrossThemeSignals.tsx (replaced by CrossSignalsWall)
- SymphonyPanel.tsx (replaced by SymphonyWall)
- TickerCard.tsx (replaced by StockCard)
- EditionHeader.tsx (no longer needed)
- ChokepointBar.tsx (no longer needed)
- Charts.tsx (not used)

## CSS Design System (globals.css)

```css
:root {
  --black: #0a0a0a;
  --glass-bg: rgba(255,255,255,0.08);
  --glass-border: rgba(255,255,255,0.12);
  --glass-hover-bg: rgba(255,255,255,0.14);
  --glass-hover-border: rgba(255,255,255,0.2);
  --text-primary: #ffffff;
  --text-secondary: rgba(255,255,255,0.6);
  --text-dim: rgba(255,255,255,0.3);
  --accent: #ff8c00;
  --bull: #00e676;
  --bear: #ff1744;
  --serif: 'Georgia', 'Times New Roman', serif;
  --mono: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;
  --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html {
  scroll-behavior: smooth;
  background: var(--black);
  color: var(--text-primary);
}

body {
  font-family: var(--sans);
  background: var(--black);
  overflow-x: hidden;
}

/* Video wall base */
.video-wall {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.video-wall video {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  z-index: 0;
}

.video-wall::after {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: linear-gradient(
    to bottom,
    rgba(0,0,0,0.6) 0%,
    rgba(0,0,0,0.4) 40%,
    rgba(0,0,0,0.7) 100%
  );
  z-index: 1;
}

.video-wall > *:not(video):not(::after) {
  position: relative;
  z-index: 2;
}

/* Blend mode text — self-contrasting against any footage */
.blend-text {
  mix-blend-mode: difference;
  color: #ffffff;
}

/* Glass card system */
.glass-card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
  background: var(--glass-hover-bg);
  backdrop-filter: blur(30px);
  border-color: var(--glass-hover-border);
  transform: translateY(-2px);
}

/* Serif display */
.display-title {
  font-family: var(--serif);
  font-weight: 400;
  letter-spacing: -0.03em;
  line-height: 1.05;
}

/* Monospace data */
.data-text {
  font-family: var(--mono);
  font-size: 0.85rem;
}

.label-text {
  font-family: var(--mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-dim);
}

/* Severity pills */
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 100px;
  font-family: var(--mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
}

.pill.critical { border-color: var(--accent); color: var(--accent); }
.pill.high { border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.7); }
.pill.rising { border-color: rgba(255,255,255,0.15); color: rgba(255,255,255,0.5); }

/* Scroll indicator */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(10px); }
}

.scroll-indicator {
  animation: float 2s ease-in-out infinite;
}
```

## Key Implementation Details

1. **Videos**: Use `<video autoPlay loop muted playsInline>` with poster images (black)
2. **Lazy loading**: Only load videos when they enter viewport via IntersectionObserver
3. **Performance**: Set `preload="none"` on videos, load on scroll
4. **Glassmorphism**: Requires `-webkit-backdrop-filter` for Safari support
5. **Blend mode**: `mix-blend-mode: difference` on theme titles and section headers — this is THE key technique from Builders Club
6. **Scroll**: Pure CSS smooth scroll, no JS scroll library needed
7. **Mobile**: Videos still work on mobile, cards stack vertically (1 column)
8. **Static export**: `output: 'export'` in next.config.js — all videos are external URLs, no server needed

## DO NOT
- Use any UI framework (no Tailwind, no MUI, no Chakra)
- Add colored tag backgrounds for armies (text labels only, never color fills)
- Create a sidebar, command bar, or Bloomberg-style chrome
- Use tables for data — glassmorphic cards instead
- Add any API keys or tokens to the code
- Change types in editions.ts
- Change data in editions/

## Build & Deploy
```bash
npx next build  # static export to /out
CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=d4558c8778a665bf856b6bf859aaba7e npx wrangler pages deploy out --project-name=cosmic-signal
```
