# Cosmic Signal — Phase 2 PRD
## Thematic Investment Strategy Builder

---

## 1. Vision

**Cosmic Signal becomes a web app that lets anyone turn their view of the future into an investible strategy — and keeps that strategy alive as the world changes.**

The user understands the world — geopolitics, technology, energy, demographics — but may not understand how to translate that understanding into market positions. Cosmic Signal bridges that gap with an AI research agent that decomposes their worldview into causal chains, identifies second- and third-order effects, surfaces supporting and contrarian evidence, and ultimately constructs a portfolio of public market positions that express their thesis.

But forming the thesis is only the beginning. The world doesn't stop once you've built your causal chain. **Cosmic Signal has three engines running simultaneously:**

1. **Formation Engine** (interactive AI) — The user and agent work together to decompose a worldview into a causal chain, map it to positions, and stress-test it with contrarian evidence. This is the thesis architect.

2. **Monitoring Engine** (cron-driven) — Once a thematic goes active, automated jobs continuously scan news, data, and filings for signals that confirm, challenge, or break the thesis. These signals feed into the thematic in real-time — no user effort required.

3. **Evolution Engine** (weekly synthesis) — Each week, the agent reviews the accumulated signals for every active thematic and writes a personalized brief: what changed, what it means, whether the thesis is strengthening or under pressure, and whether any positions need adjustment. This is the thesis growing up.

The product is not a stock picker. It is a **living thesis-to-portfolio system** — formed by the user, monitored by machines, evolved by AI.

---

## 2. Core Insight

> Most people have a view on where the world is going. Almost none can express that view in a portfolio.

The gap isn't intelligence — it's translation. A user knows that AI will drive energy demand, but they don't know what a "treatment charge" is, or that uranium enrichment is a bottleneck, or that LEAPS exist as a vehicle. The agent's job is to make those connections visible and actionable.

**The key mechanism is causal chain decomposition:**

```
THEME: AI scaling hits physical limits
  │
  ├─ 1st order: Data centers need more power
  │    ├─ 2nd order: Nuclear renaissance (clean baseload for tech)
  │    │    ├─ 3rd order: Uranium supply deficit (mines can't scale fast enough)
  │    │    └─ 3rd order: SMR regulatory pathway (NRC approval = moat)
  │    ├─ 2nd order: Grid infrastructure overhaul
  │    │    └─ 3rd order: Copper demand surge (electrification of everything)
  │    └─ 2nd order: Cooling systems bottleneck
  │         └─ 3rd order: Water rights in arid regions
  │
  ├─ INVESTIBLE: UUUU, UEC, SMR, MP, copper futures, VRT
  │
  └─ CONTRARIAN: AI efficiency gains reduce power demand per FLOP
                 Small modular reactors never get commercialized
                 Copper substitutes (aluminum) erode demand
```

Each node in this tree is a research conversation. The agent helps the user see not just the obvious first-order take, but the **second- and third-order effects where the real asymmetric returns live** — because those are the positions no one else is taking.

---

## 3. Design Philosophy

**Apple minimalism. Content-first. Zero decoration.**

The current cinematic video-wall UI is stripped entirely. Phase 2 starts from a blank canvas with these principles:

- **Typography is the interface** — SF Pro system font, clear hierarchy, generous whitespace
- **White and light gray backgrounds** — clean, calm, trustworthy. Not a trading terminal. Not a cinema.
- **One action at a time** — the user is never presented with 40 data points. They are in a conversation.
- **Cards, not walls** — information is organized in flat, subtle cards with soft shadows. No glassmorphism, no gradients, no video backgrounds.
- **Progressive disclosure** — detail is revealed as the user goes deeper. The top level is always simple.
- **System light mode default** — the app feels like Notes, not like Bloomberg. Approachable.

**Reference tone**: Apple Notes meets Notion meets a really good research analyst who happens to be patient.

---

## 4. Target User

**Persona: The Informed Observer**

- Age 28–55, globally distributed
- Reads widely: economics, geopolitics, tech, energy policy
- Has strong views about where the world is heading
- May have investment accounts but doesn't actively manage a thesis-driven portfolio
- Finds stock screeners and financial dashboards intimidating or irrelevant
- Wants to invest in **what they understand about the world**, not what a robo-advisor picks for them based on a risk questionnaire

**What they are not**: A day trader. A quant. Someone who wants to pick individual stocks from a chart.

**What they need**: A thinking partner that takes their worldview seriously and shows them how to express it in markets — while being honest about what could go wrong.

---

## 5. Product Architecture

### 5.1 Information Hierarchy

```
App
├── Onboarding
│   ├── Market Access (which markets/exchanges the user can trade)
│   └── First Thematic (guided creation with the Formation Engine)
│
├── Dashboard
│   ├── Active Thematics (cards, one per theme)
│   ├── Portfolio Overview (aggregate view across all thematics)
│   └── Weekly Brief (latest synthesis, unread indicator)
│
├── Thematic Detail
│   ├── Causal Chain (interactive tree: theme → effects → positions)
│   ├── Research Log (conversation history with the Formation Engine)
│   ├── Positions (specific investible vehicles for this theme)
│   ├── Contrarian Case (what kills this thesis)
│   ├── Signals (cron-fed feed of confirming/challenging news)
│   └── Weekly Briefs (archive of weekly syntheses for this theme)
│
├── Research Conversation
│   └── AI Agent Chat (Formation Engine — build and refine a theme)
│
├── Weekly Brief
│   └── Per-user digest (Evolution Engine — thesis evolution across all themes)
│
└── Settings
    ├── Market Access (update exchanges, account types)
    ├── Risk Parameters (position limits, instrument preferences)
    ├── Notification Preferences (signal alerts, brief delivery)
    └── Account
```

### 5.2 Data Model

```
User
├── id
├── market_access: MarketAccess
├── risk_params: RiskParams
├── notification_prefs: NotificationPrefs
├── thematics: Thematic[]
└── weekly_briefs: WeeklyBrief[]

MarketAccess
├── exchanges: string[]  // ["NYSE", "NASDAQ", "LSE", "TSE", ...]
├── instruments: string[] // ["stocks", "etfs", "options", "leaps", "futures"]
├── regions: string[]     // ["US", "EU", "JP", "AU", ...]
└── currency: string      // "USD"

RiskParams
├── max_position_pct: number   // default 15
├── max_portfolio_risk_pct: number  // default 30
├── prefer_passive: boolean    // ETF-first vs individual stocks
└── leverage_tolerance: "none" | "moderate" | "aggressive"

NotificationPrefs
├── signal_alerts: boolean        // push on thesis-break signals
├── signal_alert_threshold: "all" | "strong" | "thesis_break"
├── brief_delivery: "in_app" | "email" | "both"
├── brief_day: string             // "Sunday" default
└── brief_time: string            // "08:00" default

Thematic
├── id
├── title: string             // "Nuclear Renaissance"
├── thesis: string             // User's original articulation
├── status: "drafting" | "active" | "challenged" | "archived"
├── causal_chain: CausalNode[] // The tree of effects
├── positions: Position[]       // Investible vehicles
├── contrarian: ContrarianCase
├── signals: Signal[]          // Cron-fed confirm/challenge feed
├── conversations: Conversation[]
├── weekly_briefs: WeeklyBrief[]  // Weekly syntheses for this theme
├── monitoring_queries: MonitoringQuery[] // The search queries the cron runs
├── created_at
└── updated_at

MonitoringQuery
├── id
├── query: string           // "uranium supply deficit Kazakhstan"
├── source_types: string[]  // ["mainstream", "official", "research"]
├── frequency: "daily" | "weekly"
├── related_node_ids: string[]
└── created_by: "agent" | "user"

CausalNode
├── id
├── text: string               // "Data centers need baseload power"
├── order: number              // 1st, 2nd, 3rd
├── parent_id: string | null
├── confidence: "high" | "medium" | "low"
├── sources: Source[]
└── children: CausalNode[]

Position
├── id
├── ticker: string
├── name: string
├── vehicle: "stock" | "etf" | "leaps" | "option"
├── rationale: string           // Why this specific position
├── entry_signal: string       // When to enter
├── exit_signal: string        // When to exit
├── position_pct: number       // Suggested portfolio allocation
├── status: "watching" | "entered" | "exited"
└── causal_node_id: string     // Which part of the chain this expresses

ContrarianCase
├── summary: string            // The bull case, honestly stated
├── challenges: ContrarianItem[]
└── kill_scenarios: string[]   // "If X happens, this thesis is dead"

ContrarianItem
├── text: string              // "AI efficiency gains reduce per-FLOP power demand"
├── severity: "thesis_break" | "significant" | "moderate"
├── likelihood: "high" | "medium" | "low"
└── sources: Source[]

Signal
├── id
├── headline: string
├── summary: string
├── direction: "confirming" | "challenging" | "neutral"
├── strength: "strong" | "moderate" | "weak" | "thesis_break"
├── source: Source
├── date: string
├── related_node_ids: string[]
└── reviewed_in_brief: string | null  // WeeklyBrief id if covered

WeeklyBrief
├── id
├── date: string                 // "2026-05-17"
├── period_start: string
├── period_end: string
├── thematics_covered: string[]   // Thematic ids
├── sections: BriefSection[]      // One section per thematic
├── cross_signals: CrossSignal[]  // Signals that affect multiple thematics
├── overall_assessment: string   // "Your portfolio thesis strengthened this week"
├── read: boolean
└── created_at

BriefSection
├── thematic_id: string
├── thematic_title: string
├── thesis_health: "strengthening" | "stable" | "under_pressure" | "breaking"
├── summary: string              // 2-3 sentence overview
├── key_developments: string[]   // What happened this week
├── signal_summary: string      // "3 confirming, 1 challenging"
├── position_adjustments: string | null  // "Consider adding to UUUJ position"
├── agent_note: string | null    // Personalized, conversational note from the agent
└── new_contrarian_flags: ContrarianItem[]  // New risks that emerged this week

CrossSignal
├── description: string         // "China rare earth controls affect both Nuclear and Mineral themes"
├── thematics: string[]
├── direction: "reinforcing" | "contradictory"
└── strength: 1 | 2 | 3 | 4 | 5
```

---

## 6. User Flows

### 6.1 Onboarding

**Goal**: Get the user from "I have a view" to their first thematic with a causal chain in under 10 minutes.

```
Step 1: Market Access
─────────────────────
"Which markets can you trade?"

[US Equities]    [US Options]    [US ETFs]     [US LEAPS]
[UK Equities]    [EU Equities]   [Japan]       [Australia]
[Canada]         [Futures]

User selects what they have access to. This constrains what the agent
recommends later — no LEAPS suggestions if they can't trade options.

Step 2: Your First Thematic
────────────────────────────
"What's your view? What do you think is going to happen in the world
that most people don't see yet?"

[Free text input — the user describes their thesis in plain language]

Example: "AI is going to need so much power that nuclear energy has 
to come back. Data centers can't run on solar and wind alone."

Step 3: Agent Response — Causal Chain Draft
─────────────────────────────────────────────
The agent responds with a structured decomposition:

"Here's how I see your thesis breaking down:

FIRST ORDER
  Data centers need baseload power at grid scale

SECOND ORDER  
  Nuclear energy is the only zero-carbon baseload source
  Grid infrastructure needs upgrading to handle new load
  Uranium demand increases as reactors restart and new ones are planned

THIRD ORDER
  Uranium supply is constrained — mines take 10-15 years
  SMR regulatory approvals create first-mover moats  
  Copper demand surges from electrification of everything

Let me know if this captures your thinking, or if you want to
adjust, add, or challenge any of these.

I should also flag some contrarian risks:
  • AI training efficiency is improving fast — power per FLOP 
    is dropping. Demand may not scale linearly.
  • Small modular reactors have never been commercialized. 
    The NRC process could stall for years.
  • Renewables + battery storage may close the baseload gap 
    faster than expected."

Step 4: Refinement Conversation
────────────────────────────────
User and agent iterate. User can:
  - Confirm: "Yes, the uranium supply deficit is the key part"
  - Challenge: "I don't think SMRs are real — focus on existing reactors"
  - Add: "What about cooling? Data centers use insane water"
  - Deepen: "Tell me more about uranium supply constraints"

The agent adjusts the causal chain in real-time.

Step 5: From Chain to Positions
────────────────────────────────
Once the user is satisfied with the chain, the agent maps it to
investible vehicles constrained by Market Access:

"Based on your chain and the markets you have access to, here are
positions that express different parts of your thesis:

DIRECT EXPRESSION (high conviction)
  UUUU — Uranium Energy Corp (producing uranium miner)
  UEC  — Uranium Energy Corp (another junior, US-focused)

SECOND DERIVATIVE
  SMR  — NuScale (only NRC-approved SMR design)
  MP   — MP Materials (rare earths, supply sovereignty)

BROAD EXPOSURE
  GDXJ — Junior Gold Miners ETF (as a hedge if fiat cracks)

Each position links back to which part of your causal chain it
expresses, and I'll show you what would make me want to exit."

Step 6: Dashboard
──────────────────
User lands on their Dashboard with their first thematic card,
showing status, number of positions, and latest signal.
```

### 6.2 Adding a New Thematic

From the Dashboard:

```
[+ New Thematic] button

Same flow as Steps 2–5 above, but faster because:
  - Market access is already set
  - The user has seen the pattern before
  - The agent can reference existing thematics for cross-signals
```

### 6.3 Deepening an Existing Thematic

From a Thematic card on the Dashboard:

```
Click → Thematic Detail view

Shows:
  - Causal chain as an interactive tree (expandable nodes)
  - Current positions with status
  - Contrarian case summary
  - Signal feed (recent news/data that affects the thesis)
  - [Continue Research] button → opens research conversation
```

### 6.4 Ongoing Signal Monitoring

After a thematic goes "active," the Monitoring Engine takes over daily:

- **Daily cron** runs each thematic's `monitoring_queries` against news sources
- **AI evaluation**: the agent reads each result and classifies it as confirming/challenging/neutral
- **Signals accumulate** in the Thematic Detail feed, linked to specific causal chain nodes
- **Thesis-break alerts**: if a signal severity is `thesis_break`, the user gets an immediate push notification (based on their `NotificationPrefs`)
- **No user effort required** — the thesis stays alive even when the user isn't paying attention

### 6.5 Weekly Thesis Evolution

Every Sunday (configurable), the Evolution Engine generates a personalized brief:

1. Pulls the week's signals across all active thematics
2. For each thematic: assesses thesis health, key developments, position adjustments, new contrarian flags
3. Cross-references: identifies signals affecting multiple thematics
4. Writes the brief in the agent's voice — thesis-specific, action-oriented, honest about risk
5. Delivers in-app (unread badge) + optional email

The user can then:
- Read the brief and take action on position adjustments
- Return to the Formation Engine to refine or deepen a thesis based on new information
- Do nothing and wait for next week's brief (the monitoring continues regardless)

### 6.6 Deepening an Existing Thematic

At any point — after reading a weekly brief, after getting a thesis-break alert, or just because they had a new idea — the user can return to the Formation Engine:

- The conversation continues from where it left off, but now the agent has the full context of accumulated signals
- The agent can reference specific news events that confirmed or challenged the thesis
- The user can adjust the causal chain, add new nodes, remove positions, or create new monitoring queries
- The thesis evolves through conversation, not just through automated monitoring

---

## 7. The Three Engines

The system is powered by three engines running simultaneously. Each has a different cadence, trigger, and purpose — but they share the same AI agent, the same data model, and the same contrarian discipline.

---

### 7.1 Formation Engine (Interactive AI)

**When:** On-demand. Triggered by the user clicking "New Thematic" or "Continue Research."

**What it does:**
- Decomposes the user's thesis into a causal chain (1st → 2nd → 3rd order effects)
- Identifies bottleneck nodes in the chain (where pricing power lives)
- Maps each node to investible vehicles, constrained by the user's market access
- Presents contrarian evidence with the same rigor as supporting evidence
- Refines the chain through conversation — the user can confirm, challenge, add, or prune nodes
- When the chain is mature and positions are mapped, proposes monitoring queries for the cron engine

**Agent behavior principles:**

1. **Convexity-first**: Favors positions with asymmetric payoff profiles. Explains WHY a position has convexity, not just that it does.

2. **Contrarian honesty**: Every thesis gets a contrarian case. Every position gets an exit signal. The agent presents these with the same rigor as the bull case. If the user is excited about nuclear, the agent's job is to make the case for why nuclear might fail — not to rain on the parade, but to make sure the user is investing with eyes open.

3. **Causal specificity**: The agent doesn't say "invest in energy." It says "invest in uranium juniors because they are the bottleneck in the nuclear fuel cycle, and bottleneck = pricing power." Each position maps to a specific node in the causal chain.

4. **Market realism**: The agent respects what the user can actually trade. No futures for retail investors. No US-only ETFs for Australian users. Works within constraints.

5. **Progressive depth**: Starts simple, goes deeper on demand. Doesn't dump the entire causal chain and 40 tickers in one response. Builds understanding iteratively.

6. **Source discipline**: Every claim gets a source link. No assertion without evidence. The agent marks confidence levels and admits when data is mixed or unavailable.

**Conversation tone:** Like a talented junior analyst who listens before speaking, structures thinking visually, flags risks proactively, admits uncertainty, and writes in clear jargon-free language with an option to go deeper on technical topics.

---

### 7.2 Monitoring Engine (Cron-Driven)

**When:** Runs daily (weekday mornings) per active thematic. No user interaction required.

**What it does:**
- Executes each thematic's `monitoring_queries` against Google News RSS, HN Algolia, and other sources
- Classifies each result as confirming/challenging/neutral relative to the thesis
- Assigns signal strength (strong/moderate/weak/thesis_break) based on keyword matching and context
- Stores results as `Signal` objects linked to specific causal chain nodes
- If a `thesis_break` signal is detected, triggers an immediate notification to the user (if their notification prefs allow it)
- Updates the thematic's signal feed visible in Thematic Detail

**How monitoring queries are generated:**
When the Formation Engine finalizes a thematic, the agent proposes a set of monitoring queries — one per causal chain node, plus general theme-level queries. The user can edit, add, or remove these before the cron starts running. This ensures the monitoring is targeted, not generic.

Example monitoring queries for "Nuclear Renaissance":
```
Node 1 (AI power demand):   "data center power demand growth 2026"
Node 2 (Nuclear baseload):  "nuclear reactor restart approval 2026"
Node 3 (Uranium supply):    "uranium supply deficit Kazakhstan production"
Node 3 (SMR regulation):    "NuScale NRC certification SMR progress"
General:                    "nuclear renaissance investment thesis 2026"
Contrarian:                 "AI training efficiency improvements power reduction"
```

**Key design principle:** The cron runs the search, but the AI agent reads the results. Raw RSS items aren't signals — the agent evaluates whether each article actually confirms, challenges, or is neutral toward the specific thesis node it's linked to. This is where the AI earns its keep: not just gathering information, but interpreting it in context.

---

### 7.3 Evolution Engine (Weekly Synthesis)

**When:** Runs once per week (default: Sunday 8am user local time). Generates one WeeklyBrief per user.

**What it does:**
1. **Gather:** Pulls all Signals from the past 7 days across all the user's active thematics
2. **Analyze:** For each thematic, the agent assesses:
   - Thesis health: strengthening / stable / under_pressure / breaking
   - Key developments: what actually happened this week
   - Signal balance: confirming vs. challenging
   - Position adjustments: does anything need to change?
   - New contrarian flags: risks that emerged this week that weren't on the radar
3. **Cross-reference:** Identifies signals that affect multiple thematics (reinforcing or contradictory)
4. **Synthesize:** Writes a personalized brief — not a news digest, but a thesis evolution document. The tone is conversational, like the agent is a portfolio manager writing to an investor they respect.
5. **Deliver:** Posts the brief in-app (with unread indicator on Dashboard). If the user has email delivery on, sends it as a clean, well-formatted email.

**What the weekly brief is NOT:**
- A news recap ("Uranium prices rose 3% this week")
- A market commentary ("The S&P 500 was up 1.2%")
- Generic financial advice

**What the weekly brief IS:**
- Thesis-specific: "Your nuclear thesis strengthened this week. Kazakhstan's production cut confirms the supply deficit node. No new contrarian signals."
- Action-oriented: "Consider scaling into UUUJ on any pullback below $7. The entry signal (spot > $70) is now active."
- Honest about risk: "One challenging signal: a new paper from Stanford suggests AI training efficiency is improving faster than expected. This doesn't break the thesis yet, but worth watching."
- Personal: The agent references the user's specific causal chain, not generic themes. It remembers which nodes the user cared about most.

**Example weekly brief section:**

```
Nuclear Renaissance — Strengthening ▲

This was a good week for your thesis. Three confirming signals, 
zero challenging.

Key developments:
  • Kazatomprom cut 2026 output targets by 12% (your uranium 
    supply node). This is a strong confirming signal — supply 
    deficit just got more real.
  • Microsoft signed a PPA with Helion Nuclear for data center 
    power. Not directly investible yet, but validates the 
    nuclear-baseload-for-AI narrative.
  • Spot U3O8 touched $82/lb — your symphony entry trigger for 
    UUUU/UEC is now active.

Position note: Your entry signal for UUUU and UEC has triggered. 
If you want to act, now is the time per your own rules. I'd 
suggest the 40% first tranche, not full position — the thesis 
is strengthening but the uranium spot price is volatile.

No new contrarian flags this week.
```

**Cross-thematic section (if user has multiple themes):**

```
Cross-Signal

China's expanded gallium export controls affect two of your 
themes: Nuclear (gallium is used in some SMR reactor designs) 
and Critical Minerals (supply sovereignty thesis). This is a 
reinforcing signal — the same geopolitical pressure strengthens 
both theses simultaneously.
```

---

### 7.4 How the Three Engines Relate

```
User creates theme ──→ Formation Engine (interactive AI)
                          │
                          ├── Builds causal chain
                          ├── Maps positions
                          ├── Generates monitoring queries
                          └── Proposes contrarian case
                          │
                          ▼
                    Thematic goes "active"
                          │
               ┌──────────┴──────────┐
               │                     │
        Monitoring Engine       User can return
        (daily cron)            to Formation Engine
               │                anytime to deepen/adjust
               │                     │
               ▼                     │
        Signals accumulate             │
        in thematic's feed             │
               │                     │
               └──────────┬──────────┘
                          │
                          ▼
                   Evolution Engine
                   (weekly cron)
                          │
                   Reads all signals,
                   assesses thesis health,
                   writes personalized brief
                          │
                          ▼
                   WeeklyBrief delivered
                   (in-app + optional email)
                          │
                   ┌──────┴──────┐
                   │             │
             User reads it   User ignores it
                   │             │
                   ▼             ▼
             Returns to       Gets notified
             Formation        again next week
             Engine to        (or on thesis_break)
             refine thesis
```

The key insight: **the cron doesn't replace the agent. The cron feeds the agent.** The Monitoring Engine gathers raw material. The Evolution Engine processes it into thesis-level insight. The Formation Engine is always available when the user wants to dig deeper or adjust course.

---

## 8. Screen-by-Screen Specification

### 8.1 Onboarding — Market Access

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Which markets do you have access to?           │
│                                                 │
│  This helps me recommend positions you can       │
│  actually trade.                                │
│                                                 │
│  MARKETS                                        │
│  ☑ US Equities    ☑ US ETFs     ☐ US Options    │
│  ☐ US LEAPS       ☐ US Futures  ☐ UK Equities   │
│  ☐ EU Equities    ☐ Japan       ☐ Australia     │
│  ☐ Canada         ☐ Hong Kong                    │
│                                                 │
│  [Continue]                                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 8.2 Onboarding — First Thematic

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  What do you think is going to happen           │
│  that most people don't see yet?                │
│                                                 │
│  ┌─────────────────────────────────────────────┐│
│  │                                             ││
│  │  AI is going to need so much power that      ││
│  │  nuclear has to come back. Data centers      ││
│  │  can't run on wishful thinking about         ││
│  │  renewables alone.                          ││
│  │                                             ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  [Build This Thesis]                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 8.3 Thematic Detail — Causal Chain

```
┌─────────────────────────────────────────────────┐
│  ← Back     Nuclear Renaissance                 │
│                                                 │
│  CAUSAL CHAIN                                   │
│                                                 │
│  1st ─ AI scaling requires grid-scale power     │
│  │                                              │
│  ├─ 2nd ─ Nuclear is the only zero-carbon       │
│  │       baseload source                        │
│  │   ├─ 3rd ─ Uranium supply deficit            │
│  │   │         → UUUU  UEC                      │
│  │   └─ 3rd ─ SMR regulatory moat              │
│  │             → SMR                            │
│  │                                              │
│  ├─ 2nd ─ Grid infrastructure overhaul          │
│  │   └─ 3rd ─ Copper demand surge               │
│  │             → MP  COPP                       │
│  │                                              │
│  └─ 2nd ─ Data center cooling bottleneck         │
│            → VRT                                │
│                                                 │
│  CONTRARIAN ──────────────────────────────      │
│                                                 │
│  ⚠ AI efficiency may reduce per-FLOP demand    │
│  ⚠ SMRs have never been commercialized         │
│  ✕ If solar+battery closes baseload gap,        │
│    this thesis is dead                          │
│                                                 │
│  [Continue Research]  [View Positions]          │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 8.4 Research Conversation

```
┌─────────────────────────────────────────────────┐
│  ← Back     Nuclear Renaissance                 │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  You: I think the uranium supply deficit is the │
│  most important part. Can we go deeper on that? │
│                                                 │
│  Agent: The uranium supply deficit is the core  │
│  bottleneck. Here's why:                        │
│                                                 │
│  • Global reactors need ~190M lbs U3O8/year     │
│  • Mine production is only ~140M lbs            │
│  • The gap is filled by secondary supplies       │
│    (dismantled warheads, inventories) — which    │
│    are running out                               │
│  • New mines take 10-15 years from discovery    │
│    to production                                 │
│                                                 │
│  This means any increase in reactor demand      │
│  (from SMRs, restarts, or new builds) can't     │
│  be met by new supply in this decade.            │
│                                                 │
│  The investible expression:                     │
│  - UUUU and UEC are producing US-based          │
│    juniors with existing mines                   │
│  - They have production NOW, not in 10 years     │
│  - Pricing power goes to existing producers      │
│    when supply is inelastic                      │
│                                                 │
│  But I should flag:                             │
│  ⚠ Kazakhstan (40% of world supply) could       │
│    increase production and crash the price       │
│  ⚠ If the nuclear renaissance stalls, these     │
│    miners have no alternative revenue            │
│                                                 │
│  Sources:                                       │
│  † UxC Nuclear Fuel Price Indicator              │
│  † World Nuclear Association Supply Report 2025  │
│                                                 │
│  ┌─────────────────────────────────────────────┐│
│  │                                             ││
│  └─────────────────────────────────────────────┘│
│                                                 │
└─────────────────────────────────────────────────┘
```

### 8.5 Dashboard

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Your Thematics                                 │
│                                                 │
│  ┌─────────────────────┐ ┌─────────────────────┐│
│  │ Nuclear Renaissance  │ │ Fossil Fuel Return  ││
│  │ Active · 4 positions │ │ Drafting · 0 pos    ││
│  │                     │ │                     ││
│  │ ▲ UUUU +12%        │ │                     ││
│  │ ▼ SMR  -3%         │ │                     ││
│  │ 2 new signals       │ │ 3 days ago          ││
│  └─────────────────────┘ └─────────────────────┘│
│                                                 │
│  ┌─────────────────────┐                        │
│  │ + New Thematic      │                        │
│  │                     │                        │
│  │ What's your view?   │                        │
│  └─────────────────────┘                        │
│                                                 │
│  ─────────────────────────────────────          │
│                                                 │
│  Weekly Brief · May 17               ● Unread  │
│  "Nuclear thesis strengthened. Kazakhstan       │
│   cut confirms supply deficit. Consider          │
│   scaling into UUUU."                           │
│                                                 │
│  [Read Full Brief]                              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 8.6 Position View

```
┌─────────────────────────────────────────────────┐
│  ← Back     Nuclear Renaissance                 │
│                                                 │
│  POSITIONS                                      │
│                                                 │
│  UUUU  Uranium Energy Corp                      │
│  Stock · $7.42 · Risk: High                     │
│  Expresses: Uranium supply deficit              │
│  Entry: Spot U3O8 > $70/lb                      │
│  Exit: Spot U3O8 < $55/lb or thesis break       │
│  Allocation: 8%                                  │
│                                                 │
│  UEC   Uranium Energy Corp                      │
│  Stock · $15.16 · Risk: High                    │
│  Expresses: Uranium supply deficit (US-focused) │
│  Entry: Spot U3O8 > $70/lb                      │
│  Exit: Spot U3O8 < $55/lb or thesis break       │
│  Allocation: 8%                                  │
│                                                 │
│  SMR   NuScale Power                            │
│  Stock · $14.80 · Risk: Very High               │
│  Expresses: SMR regulatory moat                 │
│  Entry: NRC design certification news           │
│  Exit: Design certification denied              │
│  Allocation: 5%                                  │
│                                                 │
│  MP    MP Materials                              │
│  Stock · $22.10 · Risk: Medium                  │
│  Expresses: Critical mineral sovereignty         │
│  Entry: China REE export controls tighten        │
│  Exit: China reverses controls or substitutes     │
│  Allocation: 6%                                  │
│                                                 │
│  ─────────────────────────────────────          │
│  Total allocated: 27% · Cash reserve: 73%       │
│  Max position: 8% · Thesis break = full exit    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 8.7 Weekly Brief

```
┌─────────────────────────────────────────────────┐
│  ← Back     Weekly Brief · May 17               │
│                                                 │
│  Your Portfolio This Week                       │
│                                                 │
│  Overall: Thesis Strengthened ▲                 │
│                                                 │
│  ────── Nuclear Renaissance ──────────          │
│                                                 │
│  Strengthening ▲                                │
│                                                 │
│  This was a good week for your nuclear          │
│  thesis. Three confirming signals, zero         │
│  challenging.                                   │
│                                                 │
│  Key developments:                              │
│  • Kazatomprom cut 2026 output targets by 12%   │
│  • Microsoft signed PPA with Helion Nuclear     │
│  • Spot U3O8 touched $82/lb                     │
│                                                 │
│  Position note: Your entry signal for UUUU and  │
│  UEC has triggered. I'd suggest the 40% first   │
│  tranche — the thesis is strengthening but       │
│  uranium spot is volatile.                      │
│                                                 │
│  No new contrarian flags this week.             │
│                                                 │
│  ────── Fossil Fuel Return ──────────           │
│                                                 │
│  Stable ─                                       │
│                                                 │
│  Quiet week. One weak confirming signal:        │
│  Peabody (BTU) earnings beat estimates.          │
│  No new position actions needed.                │
│                                                 │
│  ────── Cross-Signal ──────────                 │
│                                                 │
│  China's expanded gallium export controls       │
│  affect both Nuclear (SMR designs) and           │
│  Critical Minerals (supply sovereignty).         │
│  Reinforcing — same geopolitical pressure        │
│  strengthens both theses.                       │
│                                                 │
│  [Continue Research on Nuclear]                 │
│  [Continue Research on Fossil]                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 9. Technical Architecture

### 9.1 Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15+ (App Router) | SSR, API routes, auth-ready |
| Styling | Tailwind CSS | Fast iteration, Apple-like defaults |
| Database | Supabase (Postgres) | Auth, RLS, real-time, generous free tier |
| Auth | Supabase Auth | Email + OAuth, works on free tier |
| AI | OpenAI API (GPT-4o) via structured outputs | Reliable structured responses, tool use |
| Market Data | yfinance (build) + Finnhub (live) | Free tier covers basics |
| Hosting | Vercel | Zero-config Next.js, edge SSR |
| Search | Google News RSS + Brave API | Proven from Phase 1 |

### 9.2 Key Technical Decisions

**1. Server-side AI, not client-side**

The Formation Engine runs server-side via Next.js API routes. The client sends messages; the server orchestrates AI calls with tool use (search, market data, filings). This keeps API keys server-side and allows streaming responses.

The Monitoring and Evolution Engines run as scheduled jobs (cron), also server-side. They use the same AI agent and tools, but triggered by time, not by the user. This is the key architectural insight from Phase 1: **cron + AI is more powerful than either alone.** The cron provides consistent coverage. The AI provides interpretation. Together, they keep the thesis alive without user effort.

**2. Structured outputs for causal chains**

The agent returns causal chains as structured JSON, not free text. This allows the UI to render them as interactive trees, not chat bubbles. The conversation is free-form, but the outputs (chain, positions, contrarian cases, weekly brief sections) are typed.

**3. Persistent storage in Postgres**

Thematics, causal chains, positions, conversations, signals, and weekly briefs — all in Supabase. The user's data survives sessions. Real-time subscriptions can power the signal feed and unread brief indicators.

**4. Monitoring queries are stored, not hardcoded**

Each thematic carries its own set of `MonitoringQuery` objects. These are generated by the Formation Engine when the thematic goes active, and can be edited by the user or updated by the Evolution Engine. This makes the monitoring personalized, not generic.

**5. Static market data at build time, live on demand**

Price data for the chart modal is fetched at build time (current approach). Live prices are fetched on demand when a user opens a thematic detail. No WebSockets needed in v1.

**6. Cron architecture**

- **Monitoring cron**: Runs daily per user per active thematic. Uses Supabase to query all active thematics and their monitoring queries. Executes searches via Google News RSS, feeds results to AI for classification, stores as Signals.
- **Evolution cron**: Runs weekly per user. Pulls the week's Signals, feeds them to AI along with the full thematic context (causal chain, positions, contrarian case), generates a WeeklyBrief with structured sections.
- Both crons run as background workers, not in the Next.js server process. Options: Supabase Edge Functions, a separate worker service, or a lightweight cron runner (like the Hermes Agent cron infrastructure already in place).

### 9.3 API Routes

```
# ─── Formation Engine (interactive AI) ───

POST /api/research/message
  Body: { thematicId, message }
  Response: SSE stream of agent response
  Agent has tools: search, fetch_price, fetch_fundamentals, find_vehicles

POST /api/thematic/create
  Body: { title, thesis, marketAccess }
  Response: { thematic } with initial causal chain from agent

GET  /api/thematic/[id]
  Response: full thematic with chain, positions, contrarian, signals, briefs

PATCH /api/thematic/[id]
  Body: { causal_chain?, positions?, contrarian?, monitoring_queries? }

# ─── Monitoring Engine (cron-triggered) ───

POST /api/cron/monitor
  Triggered daily by cron scheduler
  Processes all active thematics: runs monitoring queries, feeds results to AI for classification, stores as Signals
  Returns: { thematic_id, signals_found, thesis_break_alerts }

GET  /api/thematic/[id]/signals
  Response: recent signals for this thematic, sorted by date + strength

PATCH /api/thematic/[id]/monitoring-queries
  Body: { queries: MonitoringQuery[] }
  User edits their monitoring queries

# ─── Evolution Engine (cron-triggered weekly) ───

POST /api/cron/evolve
  Triggered weekly by cron scheduler
  Generates WeeklyBrief per user: reads week's signals, assesses thesis health, writes brief
  Returns: { brief_id, thematics_covered, thesis_health_summary }

GET  /api/brief/[id]
  Response: full weekly brief with sections + cross-signals

GET  /api/briefs
  Response: list of user's weekly briefs (paginated)

# ─── Market Data ───

GET  /api/market/[symbol]
  Response: price, fundamentals, chart data
```

### 9.4 Agent Tool Definitions

```typescript
// Tools available to the research agent
const agentTools = {
  search_news: {
    description: "Search recent news and analysis about a topic",
    params: { query: string, days_back?: number },
    returns: { articles: { title, url, date, source }[] }
  },
  fetch_price: {
    description: "Get current price and key stats for a ticker",
    params: { symbol: string },
    returns: { price, change, change_pct, market_cap, pe, high_52w, low_52w }
  },
  fetch_fundamentals: {
    description: "Get detailed fundamentals for a ticker",
    params: { symbol: string },
    returns: { revenue, earnings, debt, margins, growth_rates }
  },
  find_vehicles: {
    description: "Find investible vehicles for a thesis node, constrained by market access",
    params: { 
      thesis_node: string, 
      market_access: MarketAccess,
      vehicle_preference?: "stock" | "etf" | "leaps"
    },
    returns: { vehicles: { symbol, name, vehicle_type, rationale }[] }
  },
  map_supply_chain: {
    description: "Map the supply chain for an industry to identify bottlenecks",
    params: { industry: string },
    returns: { nodes: { name, role, bottleneck_severity }[], edges: { from, to }[] }
  },
  search_filings: {
    description: "Search SEC filings for insider buying, 13D/13G, Form 4",
    params: { symbol?: string, filing_type?: string },
    returns: { filings: { type, date, entity, summary }[] }
  }
};
```

---

## 10. MVP Scope (Phase 2a)

**What we build first — 8-week target:**

### Week 1–2: Foundation
1. **Clean slate UI** — Tailwind + Apple typography, no Phase 1 styling
2. **Authentication** — Supabase email/OAuth, user table
3. **Database schema** — All tables per data model (Section 5.2)

### Week 3–5: Formation Engine
4. **Onboarding flow** — Market access selector + first thematic creation
5. **Research agent** — Interactive conversation that builds causal chain, maps positions, presents contrarian case
6. **Thematic Detail view** — Causal chain tree, position list, contrarian summary

### Week 5–6: Monitoring Engine
7. **Monitoring queries** — Agent proposes queries on thematic activation; user can edit
8. **Daily cron** — Runs monitoring queries, AI classifies results as signals, stores to DB
9. **Signal feed** — Thematic Detail shows accumulated signals with direction/strength indicators
10. **Thesis-break alerts** — Immediate notification on thesis_break signal severity

### Week 7–8: Evolution Engine
11. **Weekly cron** — Generates WeeklyBrief per user from accumulated signals
12. **Weekly Brief view** — In-app brief display with per-thematic sections + cross-signals
13. **Dashboard** — Thematic cards + latest brief preview + unread indicator
14. **Market Data** — Price charts (from Phase 1 infrastructure) for positions

### Week 8: Polish
15. **Notification preferences** — Signal alert thresholds, brief delivery method
16. **Email brief delivery** — Clean formatted email for users who want it
17. **Demo experience** — Unauthenticated sample thematic

**What we defer:**

- Portfolio-level aggregation / rebalancing (Phase 2b)
- Position tracking / P&L (Phase 2b)
- Cross-thematic correlation view (Phase 2b)
- Community / shared thematics (Phase 3)
- Broker integrations / execution (Phase 3+)
- Mobile app (Phase 3+, responsive web works v1)

---

## 11. Success Metrics

| Metric | Target | Why |
|--------|--------|-----|
| Onboarding completion | >60% | Users who start, finish their first thematic |
| First thematic depth | avg ≥ 5 causal nodes | Not just "buy nuclear ETF" |
| Contrarian engagement | >40% read contrarian case | Users are engaging with risks |
| Return rate | >50% return within 7 days | The product creates ongoing value |
| Thematic count | avg ≥ 2 per user within 30 days | Users expand their worldview |

---

## 12. Migration from Phase 1

**What we keep:**
- The domain (cosmic-signal.pages.dev)
- The edition data structure (it becomes the seed for the demo user's thematics)
- `scripts/fetch-chart-data.py` and chart infrastructure
- The research methodology (chokepoint analysis, contrarian discipline, source-first claims)
- All backtest results and reference documents
- **The cron architecture** — Phase 1 already runs daily crons for news gathering and deployment. Phase 2 extends this pattern: monitoring cron replaces the news cron, evolution cron is additive. Same infrastructure, more intelligence.

**What we remove:**
- All current UI components (HeroSection, ThemeWall, StockCard, NewsFeed, etc.)
- The video-wall / glassmorphic design system
- `globals.css` decorative styles (reset to Tailwind defaults)
- The static site generation pipeline (edition markdown → static HTML). The app is now dynamic, user-driven.

**What we rewrite:**
- The entire frontend — from cinematic newsletter to functional web app
- Data layer — from markdown files to Supabase Postgres
- Auth — from none to Supabase Auth
- AI — from cron-triggered LLM calls to interactive agent with tool use + cron-driven monitoring + cron-driven weekly synthesis
- Deployment — from Cloudflare Pages (static) to Vercel (SSR + API routes + cron)

**What we evolve (not rewrite):**
- The cron pattern. Phase 1 crons: search → LLM classify → write markdown → build → deploy. Phase 2 crons: search → LLM classify → write to DB → notify user. Same loop, richer output, per-user instead of per-publication.
- The research methodology. Phase 1 chokepoint analysis becomes Phase 2 causal chain decomposition. Same discipline, deeper structure.
- The news search pipeline. `scripts/web-search.py` becomes the Monitoring Engine's search tool. Same Google News RSS approach, now parameterized per-thematic.

---

## 13. Open Questions

1. **Pricing model**: Free tier with N thematics? Paid for AI research depth? Too early to decide — launch free, learn, then price.

2. **Regulatory**: We need clear disclaimers that this is not financial advice. The agent should never say "you should buy X." It should say "if you want to express this thesis, here are vehicles that do so." Legal review before public launch.

3. **Agent model**: Start with GPT-4o via API, but the agent orchestration layer should be model-agnostic. May want to experiment with Claude for the research depth.

4. **Cron cost modeling**: The Monitoring Engine runs daily per user per thematic. At scale, this could get expensive. Need to model: cost per user per day for news search + AI classification, and cost per user per week for the Evolution Engine. Set limits early (max active thematics per tier, max monitoring queries per thematic).

5. **Monitoring query quality**: The AI proposes queries when a thematic goes active, but bad queries produce noise, not signal. Need a feedback loop: if a monitoring query consistently produces neutral/noise results, the Evolution Engine should flag it for revision or pruning.

6. **Demo experience**: Should unauthenticated users be able to explore a sample thematic? Likely yes — let them see the product before signing up. The demo thematic should show a fully built causal chain, signals, and a weekly brief.

7. **Mobile**: The Apple-minimal design should work well on mobile from day one. No separate mobile app needed for v1.

8. **Weekly brief timing**: Default Sunday morning is good for US/EU, bad for Asia. Should brief day/time be configurable per user, or should we generate based on timezone?

9. **Signal vs. noise threshold**: How much AI classification is enough? A 3-sentence RSS summary might not contain enough context for accurate confirming/challenging classification. May need to fetch full article text, which increases latency and cost.

10. **User agency vs. automation**: Some users will want to hand everything to the AI. Others will want tight control over monitoring queries and position decisions. The product needs to support both extremes — default to automated, but allow manual override at every level.
