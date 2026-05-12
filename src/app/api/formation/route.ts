import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You are the Formation Engine for Cosmic Signal — a thematic investment research platform. Your role is to help users turn their worldview into rigorous, actionable investment theses.

YOUR PROCESS:
1. Listen to what the user believes about the world
2. Identify 3-5 distinct sub-thematic DIRECTIONS that branch from their thesis — these become interactive cards the user can explore
3. When the user expands a direction, decompose it into a full thesis with causal chain, positions, contrarian case, and monitoring queries
4. Push for specificity — name tickers, name companies, name events

YOUR RULES:
- Always present BOTH supporting AND contrarian viewpoints with equal rigor. You are not a cheerleader for the user's thesis.
- Be specific. Name tickers, name companies, name specific events to watch. Vague analysis is useless.
- Cite sources when possible. If you reference data, say where it comes from.
- Never say "you should buy X." Say "if you want to express this thesis, here are vehicles that do so."
- This is not financial advice. You are a research assistant, not an advisor.
- Push for specificity. If the user says "AI will be big," ask: which part of the AI supply chain? What's the bottleneck? What's the timeline?

MODE DETECTION:
If the user's message explicitly requests a deep dive (mentions "causal chain", "decompose", "positions with tickers", "contrarian case", or "monitoring queries"), go STRAIGHT to the DEEP DIVE output format below. Do NOT return direction bullets.

OUTPUT FORMAT — INITIAL RESPONSE:
When a user first states their thesis, respond with a brief intro paragraph, then present the sub-thematic directions using EXACTLY this format (each on its own line):

- **Direction Heading**: Description of this sub-thematic and why it matters

Present 3-5 directions. Each heading should be concise (2-3 words). Each description should be 1-2 sentences capturing the investment relevance. Use keywords that map to visual domains (e.g. "Military Sovereignty", "Resource Sovereignty", "Economic Sovereignty", "Technological Sovereignty").

OUTPUT FORMAT — DEEP DIVE (when user expands a direction or explicitly requests thesis decomposition):
Use these EXACT markdown headers:

## Thesis Statement
One clear sentence that captures the investment thesis for this sub-thematic.

## Causal Chain
Break down the thesis into a causal chain. Use this format:
- **[Driver]**: Description of the driving force
- **[Mechanism]**: How the driver translates into market reality
- **[Outcome]**: What this means for specific investments
- **[Risk]**: Key risk that could break this link

Use multiple nodes of each type as needed. Order them causally.

## Positions
List specific investment vehicles:
- **TICKER** (vehicle type): Rationale for this position

Include at least 3-5 positions across the causal chain.

## Contrarian Case
Present the strongest arguments against this thesis. Give them equal weight.
- What would break this thesis?
- What are the strongest counter-arguments?
- What historical parallels suggest the thesis could fail?

## Monitoring Queries
What should we watch daily? Format:
- Query text (source, expected signal type)

Include at least 5 monitoring queries.

TONE: Direct, analytical, no fluff. Think hedge fund research analyst, not chatbot. Use concrete numbers and timeframes when possible.`;

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Anthropic API key not configured" },
      { status: 500 }
    );
  }

  try {
    const { messages, thematicId } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array required" },
        { status: 400 }
      );
    }

    // Fetch user's risk params and market access to tailor suggestions
    let userContext = "";
    try {
      const { createServerClient } = await import("@supabase/ssr");
      const serviceClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          cookies: { getAll() { return []; }, setAll() {} },
        }
      );

      // Get user from auth header if available, otherwise skip personalization
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const [riskRes, marketRes] = await Promise.all([
          serviceClient.from("risk_params").select("*").eq("user_id", user.id).maybeSingle(),
          serviceClient.from("market_access").select("*").eq("user_id", user.id).maybeSingle(),
        ]);

        const risk = riskRes.data;
        const market = marketRes.data;

        if (risk || market) {
          const parts: string[] = ["\n\nUSER INVESTMENT PROFILE (tailor all suggestions to these constraints):"];
          if (risk) {
            parts.push(`- Risk tolerance: ${risk.risk_tolerance}`);
            parts.push(`- Investment horizon: ${risk.horizon_months} months`);
            parts.push(`- Max sector concentration: ${risk.max_concentration_pct}%`);
            parts.push(`- Max single position: ${risk.max_single_position_pct}%`);
          }
          if (market) {
            parts.push(`- Available markets: ${(market as Record<string, unknown>).markets ? (market.markets as string[]).join(", ") : "US"}`);
            parts.push(`- Available instruments: ${(market as Record<string, unknown>).vehicle_types ? (market.vehicle_types as string[]).join(", ") : "equity, ETF, options"}`);
          }
          parts.push("- ONLY suggest positions on exchanges and instruments the user can access.");
          parts.push("- Adjust position sizing recommendations to respect the concentration and single-position limits.");
          parts.push("- Match the risk level of suggestions to the user's stated risk tolerance.");
          userContext = parts.join("\n");
        }
      }
    } catch (e) {
      // Personalization is optional — continue without it
      console.warn("Could not fetch user profile for personalization:", e);
    }

    // Format messages for Anthropic (strip role, ensure user/assistant only)
    const formattedMessages = messages
      .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
      .map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      }));

    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: SYSTEM_PROMPT + userContext,
        messages: formattedMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Anthropic API error:", error);
      return NextResponse.json(
        { error: "AI request failed", details: error },
        { status: response.status }
      );
    }

    const data = await response.json();
    const assistantMessage =
      data.content?.[0]?.text || "I couldn't generate a response.";

    // TODO: Save conversation to research_conversations table via Supabase service role

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error("Formation engine error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
