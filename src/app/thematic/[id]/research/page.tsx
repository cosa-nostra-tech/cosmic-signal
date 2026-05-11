"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { Header } from "@/components/layout/Header";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_INTRO =
  "I'm your research agent. Tell me what you believe about the world, and I'll help you build a rigorous investment thesis around it. I'll present both supporting and contrarian viewpoints, help you decompose your thesis into a causal chain, and suggest positions to express it.";

export default function ResearchPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/formation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${data.error}. ${data.details || ""}`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Connection error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-57px)] flex flex-col">
        <Container className="flex-1 flex flex-col py-6">
          <h1 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-6">
            Formation Engine
          </h1>

          <div className="flex-1 overflow-y-auto mb-6 space-y-4 max-h-[calc(100vh-260px)]">
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
                  <div className="flex justify-start">
                    <div className="bg-neutral-100 text-neutral-900 rounded-2xl px-5 py-3 max-w-2xl text-sm leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </div>
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
                disabled={loading}
                className="flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all disabled:opacity-50"
              />
              <Button type="submit" disabled={loading || !input.trim()}>
                Send
              </Button>
            </form>
          </div>
        </Container>
      </div>
    </>
  );
}
