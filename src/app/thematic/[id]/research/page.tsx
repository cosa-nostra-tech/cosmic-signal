"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { Header } from "@/components/layout/Header";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export default function ResearchPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content:
        "I'm your research agent. Tell me what you believe about the world, and I'll help you build a rigorous investment thesis around it. I'll present both supporting and contrarian viewpoints, help you decompose your thesis into a causal chain, and suggest positions to express it.",
    },
  ]);
  const [input, setInput] = useState("");

  function handleSend() {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: input.trim() }]);
    setInput("");
    // TODO: Call formation API route with Anthropic
    // Placeholder response for now
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "That's an interesting thesis. Let me help you decompose it into a causal chain so we can identify where the bottleneck actually lies, and what positions would express it. (AI response not yet wired — coming soon)",
        },
      ]);
    }, 800);
  }

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-64px)] flex flex-col">
        <Container className="flex-1 py-8">
          <h1 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-6">
            Formation Engine
          </h1>

          <div className="flex-1 space-y-4 mb-6 overflow-y-auto max-h-[60vh]">
            {messages
              .filter((m) => m.role !== "system")
              .map((m, i) => (
                <div key={i}>
                  {m.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="bg-neutral-900 text-white rounded-2xl px-5 py-3 max-w-md text-sm leading-relaxed">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-start">
                      <div className="bg-neutral-100 text-neutral-900 rounded-2xl px-5 py-3 max-w-lg text-sm leading-relaxed">
                        {m.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
                className="flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all"
              />
              <Button type="submit">Send</Button>
            </form>
          </div>
        </Container>
      </div>
    </>
  );
}