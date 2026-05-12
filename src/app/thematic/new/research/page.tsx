"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { Header } from "@/components/layout/Header";
import { MessageRenderer, parseSections } from "@/components/research/MessageRenderer";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Direction {
  heading: string;
  description: string;
}

const SYSTEM_INTRO =
  "I'm your research agent. Tell me what you believe about the world, and I'll help you build a rigorous investment thesis around it. I'll present both supporting and contrarian viewpoints, help you decompose your thesis into a causal chain, and suggest positions to express it.";

export default function NewResearchPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [expandedDirection, setExpandedDirection] = useState<Direction | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Message[]>([]);
  const [expandedInput, setExpandedInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const expandedBottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Scroll management
  useEffect(() => {
    if (expandedDirection) {
      expandedBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, expandedMessages, loading, finalizing, expandedDirection]);

  const canFinalize = expandedMessages.some(
    (m) =>
      m.role === "assistant" &&
      parseSections(m.content).some((s) => s.type === "thesis")
  );

  // ---- MAIN CHAT: discover directions ----
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMessage: Message = { role: "user", content: text.trim() };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/formation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedMessages }),
        });

        const data = await res.json();

        if (data.error) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${data.error}. ${data.details || ""}` },
          ]);
        } else {
          setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Connection error. Please try again." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading]
  );

  // ---- EXPANDED CHAT: research a specific direction ----
  const sendExpandedMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading || !expandedDirection) return;

      const userMessage: Message = { role: "user", content: text.trim() };
      const updatedMessages = [...expandedMessages, userMessage];
      setExpandedMessages(updatedMessages);
      setExpandedInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/formation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedMessages }),
        });

        const data = await res.json();

        if (data.error) {
          setExpandedMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${data.error}. ${data.details || ""}` },
          ]);
        } else {
          setExpandedMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
        }
      } catch {
        setExpandedMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Connection error. Please try again." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [expandedMessages, loading, expandedDirection]
  );

  // Send with an explicit history (for the auto-kickoff on expand)
  const sendExpandedMessageWithHistory = useCallback(
    async (history: Message[]) => {
      if (loading || !expandedDirection) return;
      setLoading(true);

      try {
        const res = await fetch("/api/formation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });

        const data = await res.json();

        if (data.error) {
          setExpandedMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${data.error}. ${data.details || ""}` },
          ]);
        } else {
          setExpandedMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
        }
      } catch {
        setExpandedMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Connection error. Please try again." },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, expandedDirection]
  );

  function handleSend() {
    sendMessage(input);
  }

  function handleExpandedSend() {
    sendExpandedMessage(expandedInput);
  }

  function handleDirectionExpand(direction: Direction) {
    setExpandedDirection(direction);
    setExpandedInput("");

    // Seed the expanded chat with the direction as context
    const seedMessage: Message = {
      role: "user",
      content: `I want to explore the "${direction.heading}" thematic. ${direction.description}. Help me build an investment thesis around this. Decompose it into a causal chain, suggest specific positions with tickers, present the contrarian case, and propose monitoring queries.`,
    };
    const history = [seedMessage];
    setExpandedMessages(history);

    // Auto-send to get first AI response
    setTimeout(() => {
      sendExpandedMessageWithHistory(history);
    }, 100);
  }

  function handleCollapse() {
    setExpandedDirection(null);
    setExpandedMessages([]);
    setExpandedInput("");
  }

  async function handleFinalize() {
    if (!canFinalize || finalizing || !expandedDirection) return;
    setFinalizing(true);

    try {
      const res = await fetch("/api/formation/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: expandedMessages }),
      });

      const data = await res.json();

      if (data.error) {
        alert(`Failed to create thematic: ${data.error}`);
        setFinalizing(false);
        return;
      }

      router.push(`/thematic/${data.id}`);
    } catch {
      alert("Failed to create thematic. Please try again.");
      setFinalizing(false);
    }
  }

  // ---- EXPANDED CHAT VIEW ----
  if (expandedDirection) {
    return (
      <>
        <Header />
        <div className="min-h-[calc(100vh-57px)] flex flex-col bg-white">
          {/* Direction banner */}
          <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
            <Container>
              <div className="flex items-center justify-between">
                <div>
                  <button
                    onClick={handleCollapse}
                    className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors mb-1 flex items-center gap-1"
                  >
                    ← Back to directions
                  </button>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {expandedDirection.heading}
                  </h2>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    {expandedDirection.description}
                  </p>
                </div>
                {canFinalize && (
                  <Button
                    onClick={handleFinalize}
                    disabled={finalizing}
                    className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                  >
                    {finalizing ? "Creating thematic…" : "✓ Save thematic"}
                  </Button>
                )}
              </div>
            </Container>
          </div>

          <Container className="flex-1 flex flex-col py-6">
            <div className="flex-1 overflow-y-auto mb-6 space-y-6 max-h-[calc(100vh-280px)]">
              {expandedMessages.map((m, i) => (
                <div key={i}>
                  {m.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="bg-neutral-900 text-white rounded-2xl px-5 py-3 max-w-md text-sm leading-relaxed whitespace-pre-wrap">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start max-w-3xl">
                      <MessageRenderer content={m.content} />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-neutral-100 text-neutral-400 rounded-2xl px-5 py-3 text-sm">
                    Thinking…
                  </div>
                </div>
              )}

              <div ref={expandedBottomRef} />
            </div>

            <div className="border-t border-neutral-200 pt-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleExpandedSend();
                }}
                className="flex gap-3"
              >
                <input
                  type="text"
                  value={expandedInput}
                  onChange={(e) => setExpandedInput(e.target.value)}
                  placeholder="Dig deeper, challenge the thesis, ask for tickers…"
                  disabled={loading || finalizing}
                  className="flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all disabled:opacity-50"
                />
                <Button
                  type="submit"
                  disabled={loading || finalizing || !expandedInput.trim()}
                >
                  Send
                </Button>
              </form>
            </div>
          </Container>
        </div>
      </>
    );
  }

  // ---- MAIN VIEW: Directions cards ----
  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-57px)] flex flex-col bg-white">
        <Container className="flex-1 flex flex-col py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-sm font-medium text-neutral-400 uppercase tracking-wider">
              Formation Engine
            </h1>
          </div>

          {/* Messages area — shows user thesis + AI intro + direction cards */}
          <div className="flex-1 overflow-y-auto mb-6 space-y-6 max-h-[calc(100vh-260px)]">
            {messages.length === 0 && (
              <div className="text-sm text-neutral-400 leading-relaxed max-w-lg">
                {SYSTEM_INTRO}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i}>
                {m.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="bg-neutral-900 text-white rounded-2xl px-5 py-3 max-w-md text-sm leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start max-w-4xl w-full">
                    <MessageRenderer
                      content={m.content}
                      onDirectionSelect={handleDirectionExpand}
                    />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-neutral-100 text-neutral-400 rounded-2xl px-5 py-3 text-sm">
                  Thinking…
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-neutral-200 pt-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What do you believe about the world?"
                disabled={loading || finalizing}
                className="flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={loading || finalizing || !input.trim()}
              >
                Send
              </Button>
            </form>
          </div>
        </Container>
      </div>
    </>
  );
}
