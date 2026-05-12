import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const FINALIZE_PROMPT = `You are a JSON extraction engine. Given a research conversation between a user and an investment research assistant, extract the final thesis into a strict JSON structure.

RULES:
- Extract the best thesis statement from the conversation
- Decompose the thesis into causal nodes (drivers, mechanisms, outcomes, risks)
- List specific investment positions with tickers and rationale
- Present the strongest contrarian cases
- Propose monitoring queries for daily signal detection
- Be specific — real tickers, real companies, real events
- Return ONLY valid JSON, no markdown fences, no commentary

SCHEMA:
{
  "title": "Short thematic title (3-5 words)",
  "thesis_statement": "One sentence capturing the investment thesis",
  "confidence": "low|moderate|high|very_high",
  "causal_nodes": [
    {
      "node_type": "driver|mechanism|outcome|risk",
      "label": "Short label",
      "description": "Detailed explanation",
      "parent_node_index": null or index of parent node,
      "order_index": 0
    }
  ],
  "positions": [
    {
      "ticker": "SYMBOL",
      "vehicle_type": "equity|ETF|options|LEAPS",
      "vehicle_name": "Full company/ETF name",
      "allocation_pct": 0,
      "entry_rationale": "Why this vehicle expresses this thesis",
      "causal_node_index": null or index of linked causal node
    }
  ],
  "contrarian_cases": [
    {
      "scenario_description": "What scenario would break this thesis",
      "probability": "low|moderate|high",
      "trigger_conditions": "What specific events would signal this scenario",
      "hedge_suggestion": "How to hedge against this risk"
    }
  ],
  "monitoring_queries": [
    {
      "query_text": "Search query to run daily",
      "source_type": "news_rss|web_search|api",
      "expected_signal": "confirming|challenging|neutral",
      "causal_node_index": null or index of linked causal node
    }
  ]
}`;

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Anthropic API key not configured" },
      { status: 500 }
    );
  }

  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length < 2) {
      return NextResponse.json(
        { error: "Conversation too short to finalize" },
        { status: 400 }
      );
    }

    // Send conversation to Claude for JSON extraction
    const conversationText = messages
      .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
      .map((m: { role: string; content: string }) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: FINALIZE_PROMPT,
        messages: [{ role: "user", content: conversationText }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Anthropic finalize error:", error);
      return NextResponse.json(
        { error: "AI structuring failed", details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    let rawText = data.content?.[0]?.text || "";

    // Strip markdown code fences if present
    rawText = rawText.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();

    let thematicData;
    try {
      thematicData = JSON.parse(rawText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Raw:", rawText.substring(0, 500));
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON", raw: rawText.substring(0, 1000) },
        { status: 500 }
      );
    }

    // Use service role client to insert (bypasses RLS for server-side operations)
    const serviceClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return []; },
          setAll() {},
        },
      }
    );

    // 1. Insert thematic
    const { data: thematic, error: thematicError } = await serviceClient
      .from("thematics")
      .insert({
        user_id: user.id,
        title: thematicData.title,
        thesis_statement: thematicData.thesis_statement,
        status: "active",
        confidence: thematicData.confidence || "moderate",
      })
      .select("id")
      .single();

    if (thematicError) {
      console.error("Thematic insert error:", thematicError);
      return NextResponse.json(
        { error: "Failed to create thematic", details: thematicError.message },
        { status: 500 }
      );
    }

    const thematicId = thematic.id;

    // 2. Insert causal nodes
    const causalNodes = thematicData.causal_nodes || [];
    const nodeIds: string[] = [];

    if (causalNodes.length > 0) {
      for (let i = 0; i < causalNodes.length; i++) {
        const node = causalNodes[i];
        const parentNodeId = node.parent_node_index != null ? nodeIds[node.parent_node_index] || null : null;

        const { data: insertedNode, error: nodeError } = await serviceClient
          .from("causal_nodes")
          .insert({
            thematic_id: thematicId,
            node_type: node.node_type,
            label: node.label,
            description: node.description,
            parent_node_id: parentNodeId,
            order_index: node.order_index ?? i,
          })
          .select("id")
          .single();

        if (nodeError) {
          console.error("Causal node insert error:", nodeError);
        } else {
          nodeIds.push(insertedNode.id);
        }
      }
    }

    // 3. Insert positions
    const positions = thematicData.positions || [];
    if (positions.length > 0) {
      const positionRows = positions.map((p: any, i: number) => ({
        thematic_id: thematicId,
        causal_node_id: p.causal_node_index != null ? nodeIds[p.causal_node_index] || null : null,
        ticker: p.ticker,
        vehicle_type: p.vehicle_type || "equity",
        vehicle_name: p.vehicle_name || null,
        allocation_pct: p.allocation_pct || null,
        entry_rationale: p.entry_rationale || null,
      }));

      const { error: posError } = await serviceClient
        .from("positions")
        .insert(positionRows);

      if (posError) console.error("Positions insert error:", posError);
    }

    // 4. Insert contrarian cases
    const contrarianCases = thematicData.contrarian_cases || [];
    if (contrarianCases.length > 0) {
      const { error: conError } = await serviceClient
        .from("contrarian_cases")
        .insert(contrarianCases.map((c: any) => ({
          thematic_id: thematicId,
          scenario_description: c.scenario_description,
          probability: c.probability || "low",
          trigger_conditions: c.trigger_conditions || null,
          hedge_suggestion: c.hedge_suggestion || null,
        })));

      if (conError) console.error("Contrarian insert error:", conError);
    }

    // 5. Insert monitoring queries
    const monitoringQueries = thematicData.monitoring_queries || [];
    if (monitoringQueries.length > 0) {
      const { error: mqError } = await serviceClient
        .from("monitoring_queries")
        .insert(monitoringQueries.map((q: any) => ({
          thematic_id: thematicId,
          causal_node_id: q.causal_node_index != null ? nodeIds[q.causal_node_index] || null : null,
          query_text: q.query_text,
          source_type: q.source_type || "news_rss",
          expected_signal: q.expected_signal || "neutral",
          is_auto_generated: true,
          is_active: true,
        })));

      if (mqError) console.error("Monitoring queries insert error:", mqError);
    }

    // 6. Save the research conversation
    const { error: convError } = await serviceClient
      .from("research_conversations")
      .insert(
        messages
          .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
          .map((m: { role: string; content: string }) => ({
            thematic_id: thematicId,
            role: m.role,
            content: m.content,
          }))
      );

    if (convError) console.error("Conversation save error:", convError);

    return NextResponse.json({
      id: thematicId,
      title: thematicData.title,
      thesis: thematicData.thesis_statement,
    });
  } catch (error) {
    console.error("Finalize error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
