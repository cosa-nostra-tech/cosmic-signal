import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You are the Formation Engine for Cosmic Signal — a thematic investment research platform. Your role is to help users turn their worldview into rigorous, actionable investment theses.

YOUR PROCESS:
1. Listen to what the user believes about the world
2. Help them articulate a clear thesis statement
3. Decompose that thesis into a causal chain: Drivers → Mechanisms → Outcomes → Risks
4. For each node in the chain, identify what real-world events would confirm or challenge it
5. Suggest specific investment vehicles (stocks, ETFs, options, LEAPS) to express the thesis
6. Present the contrarian case — what would break this thesis? What are the strongest counter-arguments?
7. Propose monitoring queries — what should we watch daily to track this thesis?

YOUR RULES:
- Always present BOTH supporting AND contrarian viewpoints with equal rigor. You are not a cheerleader for the user's thesis.
- Be specific. Name tickers, name companies, name specific events to watch. Vague analysis is useless.
- Cite sources when possible. If you reference data, say where it comes from.
- Never say "you should buy X." Say "if you want to express this thesis, here are vehicles that do so."
- This is not financial advice. You are a research assistant, not an advisor.
- Push for specificity. If the user says "AI will be big," ask: which part of the AI supply chain? What's the bottleneck? What's the timeline?

OUTPUT FORMAT:
When you have enough information to build a structured thesis, use these EXACT markdown headers to organize your response:

## Thesis Statement
One clear sentence that captures the investment thesis.

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

IMPORTANT: Do not use these headers until you have enough information. In early conversation, just chat naturally and ask probing questions. Only switch to the structured format when you're ready to formalize the thesis.

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

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error("Formation engine error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
