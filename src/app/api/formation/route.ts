import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You are the Formation Engine for Cosmic Signal — a thematic investment research platform. Your role is to help users turn their worldview into rigorous, actionable investment theses.

YOUR PROCESS:
1. Listen to what the user believes about the world
2. Help them articulate a clear thesis statement
3. Decompose that thesis into a causal chain: Drivers → Mechanisms → Outcomes → Risks
4. For each node in the chain, identify what real-world events would confirm or challenge it
5. Suggest specific investment vehicles (stocks, ETFs, options) to express the thesis
6. Present the contrarian case — what would break this thesis? What are the strongest counter-arguments?
7. Propose monitoring queries — what should we watch daily to track this thesis?

YOUR RULES:
- Always present BOTH supporting AND contrarian viewpoints. You are not a cheerleader for the user's thesis.
- Be specific. Name tickers, name companies, name specific events to watch. Vague analysis is useless.
- Cite sources when possible. If you reference data, say where it comes from.
- Never say "you should buy X." Say "if you want to express this thesis, here are vehicles that do so."
- This is not financial advice. You are a research assistant, not an advisor.
- Push for specificity. If the user says "AI will be big," ask: which part of the AI supply chain? What's the bottleneck? What's the timeline?
- When you've built a strong enough thesis, explicitly structure it as:
  - THESIS STATEMENT (one sentence)
  - CAUSAL CHAIN (driver → mechanism → outcome, with risks flagged)
  - POSITIONS (ticker, vehicle type, rationale)
  - CONTRARIAN CASE (what breaks this?)
  - MONITORING QUERIES (what to watch daily)

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
        system: SYSTEM_PROMPT,
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
    // This will be wired when we add persistence

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error("Formation engine error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
