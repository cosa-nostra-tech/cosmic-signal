import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

export const maxDuration = 300;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const CRON_SECRET = process.env.CRON_SECRET;

// ─── Types ───────────────────────────────────────────────

interface MonitoringQuery {
  id: string;
  thematic_id: string;
  causal_node_id: string | null;
  query_text: string;
  source_type: string;
  expected_signal: string | null;
  noise_count: number;
  is_active: boolean;
}

interface CausalNode {
  id: string;
  node_type: string;
  label: string;
  description: string | null;
}

interface ThematicContext {
  id: string;
  title: string;
  thesis_statement: string;
  monitoring_queries: MonitoringQuery[];
  causal_nodes: CausalNode[];
}

interface SearchResult {
  title: string;
  url: string;
  date: string;
  query_text?: string;
  expected_signal?: string | null;
}

interface ClassifiedSignal {
  title: string;
  summary: string;
  classification: "confirming" | "challenging" | "neutral" | "thesis_break";
  strength: "weak" | "moderate" | "strong";
  causal_node_label: string | null;
  source_url: string;
  source_name: string;
  source_published_at: string | null;
  query_text: string;
}

// ─── XML Parsing ─────────────────────────────────────────

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const match = xml.match(regex);
  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

function parseGoogleNewsRss(xml: string): SearchResult[] {
  const items: SearchResult[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    let title = extractTag(content, "title");
    const link = extractTag(content, "link");
    const pubDate = extractTag(content, "pubDate");

    if (title) {
      // Google News wraps titles in CDATA sometimes
      title = title.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
      // Strip source suffix like " - Reuters" at end of title
      const sourceMatch = title.match(/ - (.+)$/);
      const sourceName = sourceMatch ? sourceMatch[1] : null;

      items.push({
        title: sourceMatch ? title.replace(/ - .+$/, "") : title,
        url: link || "",
        date: pubDate || "",
      });
    }
  }
  return items.slice(0, 5);
}

// ─── Search ──────────────────────────────────────────────

async function searchGoogleNews(
  query: string
): Promise<{ results: SearchResult[]; error?: string }> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return { results: [], error: `HTTP ${response.status}` };
    }
    const xml = await response.text();
    const results = parseGoogleNewsRss(xml);
    return { results };
  } catch (err) {
    return { results: [], error: String(err) };
  }
}

// ─── Claude Classification ───────────────────────────────

const CLASSIFICATION_PROMPT = `You are the Monitoring Engine for Cosmic Signal — a thematic investment research platform.

Your job: Classify news articles as investment signals for a specific thematic thesis.

INPUT:
- Thematic thesis and causal chain (provided below)
- A list of news articles found by monitoring queries

OUTPUT — a valid JSON array. One object per article that is RELEVANT to the thesis. Exclude irrelevant articles entirely.

Each object must have exactly these fields:
{
  "title": "Short headline for the signal (not the article title — write a concise signal title)",
  "summary": "1-2 sentence summary explaining how this article relates to the thesis",
  "classification": "confirming" | "challenging" | "neutral" | "thesis_break",
  "strength": "weak" | "moderate" | "strong",
  "causal_node_label": "Exact label of the most relevant causal chain node, or null if none fit",
  "source_url": "The article URL",
  "source_name": "Publisher name (extract from URL or title suffix)",
  "source_published_at": "ISO 8601 date if available, otherwise null",
  "query_text": "The monitoring query that found this article"
}

CLASSIFICATION RULES:
- "confirming": Article provides evidence SUPPORTING the thesis
- "challenging": Article presents evidence CONTRADICTING the thesis
- "neutral": Article is related but doesn't clearly support or contradict
- "thesis_break": Article presents a FUNDAMENTAL challenge that could invalidate the core thesis. Use sparingly — only for paradigm-level shifts.

STRENGTH RULES:
- "strong": Direct evidence with concrete data, official actions, or verifiable events
- "moderate": Relevant but indirect or incomplete evidence
- "weak": Tangentially related, speculative, or opinion-based

CAUSAL NODE MAPPING:
- Map each article to the MOST RELEVANT node in the causal chain
- Use the EXACT label from the causal chain provided
- Drivers = root causes, Mechanisms = transmission paths, Outcomes = market impacts, Risks = thesis breakers

DEDUPLICATION:
- If multiple articles cover the same event, keep only the most informative one
- Skip articles that are duplicates or near-duplicates of each other

Return ONLY valid JSON. No markdown fences. No commentary.`;

async function classifySignals(
  thematic: ThematicContext,
  searchResults: Map<string, SearchResult[]>
): Promise<ClassifiedSignal[]> {
  if (!ANTHROPIC_API_KEY) return [];

  // Build causal chain context
  const causalChain = thematic.causal_nodes
    .map(
      (n) =>
        `- [${n.node_type}] ${n.label}: ${n.description || "(no description)"}`
    )
    .join("\n");

  // Build article list with query context (cap at 30 per classification call)
  const articles: string[] = [];
  Array.from(searchResults.entries()).forEach(([queryText, results]) => {
    const query = thematic.monitoring_queries.find(
      (q) => q.query_text === queryText
    );
    const expectedLabel = query?.expected_signal
      ? ` (expected: ${query.expected_signal})`
      : "";
    for (const r of results) {
      if (articles.length >= 30) break;
      articles.push(
        `QUERY: "${queryText}"${expectedLabel}\nTITLE: ${r.title}\nURL: ${r.url}\nDATE: ${r.date}`
      );
    }
  });

  if (articles.length === 0) return [];

  const userMessage = `THESIS: ${thematic.thesis_statement}

CAUSAL CHAIN:
${causalChain}

ARTICLES FOUND:
${articles.join("\n\n")}

Classify each relevant article as a signal. Return JSON array.`;

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: CLASSIFICATION_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: AbortSignal.timeout(120000), // 2 minute timeout
    });

    if (!response.ok) {
      console.error(
        "Classification API error:",
        response.status,
        await response.text()
      );
      return [];
    }

    const data = await response.json();
    let rawText = data.content?.[0]?.text || "[]";

    // Strip markdown code fences if present
    rawText = rawText
      .replace(/^```json?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed)) return [];
      return parsed as ClassifiedSignal[];
    } catch (parseErr) {
      // Try to recover from truncated JSON — close the array
      try {
        const lastBrace = rawText.lastIndexOf("}");
        if (lastBrace > 0) {
          const recovered = rawText.substring(0, lastBrace + 1) + "]";
          const parsed = JSON.parse(recovered);
          if (Array.isArray(parsed)) {
            console.warn(
              `[Monitoring] Recovered ${parsed.length} signals from truncated JSON`
            );
            return parsed as ClassifiedSignal[];
          }
        }
      } catch {
        // Recovery failed
      }
      console.error("JSON parse error in classification:", parseErr);
      console.error("Raw text:", rawText.substring(0, 500));
      return [];
    }
  } catch (err) {
    console.error("Classification request failed:", err);
    return [];
  }
}

// ─── Service Role Client ─────────────────────────────────

function getServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll() { return []; }, setAll() {} },
    }
  );
}

// ─── Monitoring Pipeline ─────────────────────────────────

async function runMonitoringPipeline(thematicId?: string) {
  const serviceClient = getServiceClient();

  // 1. Fetch active thematics with monitoring queries and causal nodes
  let thematicQuery = serviceClient
    .from("thematics")
    .select(
      `
      id, title, thesis_statement, status,
      monitoring_queries(
        id, thematic_id, causal_node_id, query_text,
        source_type, expected_signal, noise_count, is_active
      ),
      causal_nodes(
        id, node_type, label, description
      )
    `
    )
    .eq("status", "active");

  if (thematicId) {
    thematicQuery = thematicQuery.eq("id", thematicId);
  }

  const { data: thematics, error: fetchError } = await thematicQuery;

  if (fetchError) {
    console.error("Failed to fetch thematics:", fetchError);
    return { signalsInserted: 0, thesisBreaks: 0, error: fetchError.message };
  }

  if (!thematics || thematics.length === 0) {
    return { signalsInserted: 0, thesisBreaks: 0, message: "No active thematics" };
  }

  let totalSignals = 0;
  let totalThesisBreaks = 0;
  const results: { thematic: string; signals: number; breaks: number }[] = [];

  for (const t of thematics) {
    const thematic: ThematicContext = {
      id: t.id,
      title: t.title,
      thesis_statement: t.thesis_statement,
      monitoring_queries: ((t.monitoring_queries as unknown as MonitoringQuery[]) || []).filter(mq => mq.is_active !== false),
      causal_nodes: (t.causal_nodes as unknown as CausalNode[]) || [],
    };

    if (thematic.monitoring_queries.length === 0) {
      results.push({ thematic: thematic.title, signals: 0, breaks: 0 });
      continue;
    }

    // 2. Run searches for each monitoring query (parallel)
    const searchResults = new Map<string, SearchResult[]>();
    const searchPromises = thematic.monitoring_queries.map(async (mq) => {
      const { results: hits, error } = await searchGoogleNews(mq.query_text);
      if (error) {
        console.warn(`Search failed for "${mq.query_text}": ${error}`);
      }
      // Attach query context to each result
      const annotated = hits.map((h) => ({
        ...h,
        query_text: mq.query_text,
        expected_signal: mq.expected_signal,
      }));
      searchResults.set(mq.query_text, annotated);
    });

    await Promise.all(searchPromises);

    // 3. Count total search hits for logging
    const totalHits = Array.from(searchResults.values()).reduce(
      (sum, r) => sum + r.length,
      0
    );
    console.log(
      `[Monitoring] ${thematic.title}: ${totalHits} articles from ${thematic.monitoring_queries.length} queries`
    );

    if (totalHits === 0) {
      // No results — update last_run_at and bump noise_count for all queries
      for (const mq of thematic.monitoring_queries) {
        await serviceClient
          .from("monitoring_queries")
          .update({
            last_run_at: new Date().toISOString(),
            noise_count: mq.noise_count + 1,
          })
          .eq("id", mq.id);
      }
      results.push({ thematic: thematic.title, signals: 0, breaks: 0 });
      continue;
    }

    // 4. Classify signals via Claude
    const classified = await classifySignals(thematic, searchResults);

    if (classified.length === 0) {
      // No signals extracted — update last_run_at
      for (const mq of thematic.monitoring_queries) {
        await serviceClient
          .from("monitoring_queries")
          .update({
            last_run_at: new Date().toISOString(),
            noise_count: mq.noise_count + 1,
          })
          .eq("id", mq.id);
      }
      results.push({ thematic: thematic.title, signals: 0, breaks: 0 });
      continue;
    }

    // 5. Deduplicate — check existing signals with same source_url in last 7 days
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const existingUrls = new Set<string>();

    const { data: existing } = await serviceClient
      .from("signals")
      .select("source_url")
      .eq("thematic_id", thematic.id)
      .gte("detected_at", sevenDaysAgo);

    if (existing) {
      for (const s of existing) {
        if (s.source_url) existingUrls.add(s.source_url);
      }
    }

    // 6. Build causal node label → ID map
    const nodeLabelToId = new Map<string, string>();
    for (const cn of thematic.causal_nodes) {
      nodeLabelToId.set(cn.label, cn.id);
    }

    // 7. Filter out duplicates and insert new signals
    const newSignals = classified.filter(
      (s) => !existingUrls.has(s.source_url)
    );

    // Map query_text back to monitoring_query_id
    const queryTextToId = new Map<string, string>();
    for (const mq of thematic.monitoring_queries) {
      queryTextToId.set(mq.query_text, mq.id);
    }

    let thesisBreakCount = 0;

    if (newSignals.length > 0) {
      const signalRows = newSignals.map((s) => ({
        thematic_id: thematic.id,
        monitoring_query_id: queryTextToId.get(s.query_text) || null,
        causal_node_id: s.causal_node_label
          ? nodeLabelToId.get(s.causal_node_label) || null
          : null,
        title: s.title,
        summary: s.summary,
        source_url: s.source_url || null,
        source_name: s.source_name || null,
        source_published_at: s.source_published_at || null,
        classification: s.classification,
        strength: s.strength,
      }));

      const { error: insertError } = await serviceClient
        .from("signals")
        .insert(signalRows);

      if (insertError) {
        console.error("Signal insert error:", insertError);
      } else {
        totalSignals += newSignals.length;
      }

      // Check for thesis_break signals
      const thesisBreaks = newSignals.filter(
        (s) => s.classification === "thesis_break"
      );
      thesisBreakCount = thesisBreaks.length;

      if (thesisBreaks.length > 0) {
        totalThesisBreaks += thesisBreaks.length;
        console.warn(
          `[Monitoring] ⚠️ THESIS BREAK detected for "${thematic.title}": ${thesisBreaks.length} break signal(s)`
        );

        // Set thematic status to "broken"
        await serviceClient
          .from("thematics")
          .update({ status: "broken" })
          .eq("id", thematic.id);
      }
    }

    // 8. Update last_run_at and noise_count for each query
    for (const mq of thematic.monitoring_queries) {
      const resultsForQuery = searchResults.get(mq.query_text) || [];
      const signalsForQuery = newSignals.filter(
        (s) => s.query_text === mq.query_text
      );
      const isNoise = resultsForQuery.length > 0 && signalsForQuery.length === 0;

      await serviceClient
        .from("monitoring_queries")
        .update({
          last_run_at: new Date().toISOString(),
          ...(isNoise ? { noise_count: mq.noise_count + 1 } : { noise_count: 0 }),
        })
        .eq("id", mq.id);
    }

    results.push({
      thematic: thematic.title,
      signals: newSignals.length,
      breaks: thesisBreakCount,
    });
  }

  return {
    signalsInserted: totalSignals,
    thesisBreaks: totalThesisBreaks,
    details: results,
  };
}

// ─── GET: Return signals for the authenticated user ──────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const thematicId = searchParams.get("thematicId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

    let query = supabase
      .from("signals")
      .select(
        `
        id, title, summary, source_url, source_name, source_published_at,
        classification, strength, detected_at,
        thematics!inner(id, title, status)
      `
      )
      .eq("thematics.user_id", user.id)
      .order("detected_at", { ascending: false })
      .limit(limit);

    if (thematicId) {
      query = query.eq("thematic_id", thematicId);
    }

    const { data: signals, error } = await query;

    if (error) {
      console.error("Signals fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch signals" },
        { status: 500 }
      );
    }

    return NextResponse.json({ signals: signals || [] });
  } catch (err) {
    console.error("Monitoring GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST: Run the monitoring pipeline (cron or manual) ──

export async function POST(request: NextRequest) {
  // Auth check: CRON_SECRET for automated runs, user session for manual
  const cronHeader = request.headers.get("x-cron-secret");
  const isCron = CRON_SECRET && cronHeader === CRON_SECRET;

  let thematicId: string | undefined;

  if (!isCron) {
    // Manual trigger — must be authenticated
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const body = await request.json();
      thematicId = body.thematicId;
    } catch {
      // No body or invalid JSON — process all user's thematics
    }
  } else {
    try {
      const body = await request.json();
      thematicId = body?.thematicId;
    } catch {
      // No body — process all active thematics
    }
  }

  console.log(
    `[Monitoring] Pipeline starting — ${isCron ? "cron" : "manual"} — thematicId: ${thematicId || "all"}`
  );

  const result = await runMonitoringPipeline(thematicId);

  console.log(`[Monitoring] Pipeline complete:`, result);

  return NextResponse.json({
    success: true,
    ...result,
  });
}
