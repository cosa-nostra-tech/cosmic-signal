"use client";

import { useState } from "react";
import Link from "next/link";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";

interface Thematic {
  id: string;
  title: string;
  thesis_statement: string;
  status: string;
  confidence: string;
  created_at: string;
  updated_at: string;
}

interface CausalNode {
  id: string;
  node_type: string;
  label: string;
  description: string | null;
  parent_node_id: string | null;
  order_index: number;
}

interface Position {
  id: string;
  ticker: string;
  vehicle_type: string;
  vehicle_name: string | null;
  allocation_pct: number | null;
  entry_rationale: string | null;
  causal_node_id: string | null;
}

interface ContrarianCase {
  id: string;
  scenario_description: string;
  probability: string;
  trigger_conditions: string | null;
  hedge_suggestion: string | null;
}

interface MonitoringQuery {
  id: string;
  query_text: string;
  source_type: string;
  expected_signal: string | null;
  is_active: boolean;
  causal_node_id: string | null;
}

interface Signal {
  id: string;
  title: string;
  summary: string;
  classification: string;
  strength: string;
  source_url: string | null;
  source_name: string | null;
  detected_at: string;
}

type Health = "strengthening" | "stable" | "under_pressure" | "breaking";

interface ThematicDashboardProps {
  thematic: Thematic;
  causalNodes: CausalNode[];
  positions: Position[];
  contrarianCases: ContrarianCase[];
  monitoringQueries: MonitoringQuery[];
  signals: Signal[];
  health: Health;
}

const healthLabels: Record<Health, string> = {
  strengthening: "↑ Strengthening",
  stable: "● Stable",
  under_pressure: "↓ Under Pressure",
  breaking: "⚠ Breaking",
};

const healthStyles: Record<Health, string> = {
  strengthening: "bg-green-50 text-green-700 border-green-200",
  stable: "bg-neutral-50 text-neutral-700 border-neutral-200",
  under_pressure: "bg-amber-50 text-amber-700 border-amber-200",
  breaking: "bg-red-50 text-red-700 border-red-200",
};

const nodeTypeStyles: Record<string, string> = {
  driver: "bg-blue-50 text-blue-700 border-blue-200",
  mechanism: "bg-purple-50 text-purple-700 border-purple-200",
  outcome: "bg-green-50 text-green-700 border-green-200",
  risk: "bg-red-50 text-red-700 border-red-200",
};

const signalStyles: Record<string, string> = {
  confirming: "text-green-600",
  challenging: "text-amber-600",
  neutral: "text-neutral-500",
  thesis_break: "text-red-600",
};

export function ThematicDashboard({
  thematic,
  causalNodes,
  positions,
  contrarianCases,
  monitoringQueries,
  signals,
  health,
}: ThematicDashboardProps) {
  const [activating, setActivating] = useState(false);
  const [addingToPortfolio, setAddingToPortfolio] = useState(false);
  const [status, setStatus] = useState(thematic.status);
  const isMonitored = status === "active";

  const confidenceLabel =
    thematic.confidence === "very_high"
      ? "Very High"
      : thematic.confidence.charAt(0).toUpperCase() + thematic.confidence.slice(1);

  async function handleActivate() {
    setActivating(true);
    try {
      const res = await fetch("/api/thematic/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thematicId: thematic.id }),
      });
      if (res.ok) {
        setStatus("active");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to activate monitoring");
      }
    } catch {
      alert("Connection error. Please try again.");
    } finally {
      setActivating(false);
    }
  }

  async function handleAddToPortfolio() {
    setAddingToPortfolio(true);
    try {
      for (const pos of positions) {
        await fetch("/api/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker: pos.ticker,
            vehicleType: pos.vehicle_type,
            source: "thematic",
            sourceThematicId: thematic.id,
          }),
        });
      }
    } catch {
      alert("Failed to add positions to portfolio");
    } finally {
      setAddingToPortfolio(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <span
            className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${healthStyles[health]}`}
          >
            {healthLabels[health]}
          </span>
          <span className="text-xs text-neutral-400">
            Confidence: {confidenceLabel}
          </span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          {thematic.title}
        </h1>
        <p className="text-neutral-500 leading-relaxed max-w-2xl">
          {thematic.thesis_statement}
        </p>
      </div>

      {/* Causal Chain */}
      {causalNodes.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">
            Causal Chain
          </h2>
          <div className="border border-neutral-200 rounded-2xl p-6">
            <div className="space-y-3">
              {causalNodes.map((node, i) => (
                <div key={node.id}>
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border shrink-0 ${
                        nodeTypeStyles[node.node_type] || "bg-neutral-50 text-neutral-700 border-neutral-200"
                      }`}
                    >
                      {node.node_type}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{node.label}</div>
                      {node.description && (
                        <div className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                          {node.description}
                        </div>
                      )}
                    </div>
                  </div>
                  {i < causalNodes.length - 1 && (
                    <div className="ml-4 my-1 text-neutral-300">↓</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Positions */}
      {positions.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">
            Positions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {positions.map((pos) => (
              <div
                key={pos.id}
                className="bg-white border border-neutral-200 rounded-xl p-4 hover:border-neutral-300 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold font-mono">{pos.ticker}</span>
                  <Pill variant="dashed">{pos.vehicle_type}</Pill>
                </div>
                {pos.vehicle_name && (
                  <div className="text-xs text-neutral-400 mb-2">{pos.vehicle_name}</div>
                )}
                {pos.entry_rationale && (
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    {pos.entry_rationale}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contrarian Cases */}
      {contrarianCases.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">
            Contrarian Cases
          </h2>
          <div className="space-y-3">
            {contrarianCases.map((cc) => (
              <div
                key={cc.id}
                className="border border-red-200 bg-red-50/30 rounded-xl p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Pill variant="solid">Risk</Pill>
                  <span className="text-xs text-neutral-400">
                    Probability: {cc.probability}
                  </span>
                </div>
                <p className="text-sm text-neutral-700 mb-2">
                  {cc.scenario_description}
                </p>
                {cc.trigger_conditions && (
                  <div className="text-xs text-neutral-500 mb-1">
                    <span className="font-medium">Triggers:</span>{" "}
                    {cc.trigger_conditions}
                  </div>
                )}
                {cc.hedge_suggestion && (
                  <div className="text-xs text-neutral-500">
                    <span className="font-medium">Hedge:</span>{" "}
                    {cc.hedge_suggestion}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Monitoring Queries */}
      {monitoringQueries.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">
            Monitoring Queries
          </h2>
          <div className="border border-neutral-200 rounded-2xl p-6">
            <div className="space-y-2">
              {monitoringQueries.map((mq, i) => (
                <div key={mq.id} className="flex items-start gap-3 py-2">
                  <span className="text-neutral-300 text-xs mt-0.5 font-mono w-5 text-right">
                    {i + 1}.
                  </span>
                  <span className="text-sm text-neutral-700 flex-1">
                    {mq.query_text}
                  </span>
                  {mq.expected_signal && (
                    <Pill variant="dashed">{mq.expected_signal}</Pill>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recent Signals */}
      <section>
        <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">
          Recent Signals
        </h2>
        {signals.length > 0 ? (
          <div className="space-y-2">
            {signals.map((signal) => (
              <div
                key={signal.id}
                className="border border-neutral-200 rounded-xl p-4 hover:border-neutral-300 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-medium ${
                      signalStyles[signal.classification] || "text-neutral-500"
                    }`}
                  >
                    {signal.classification === "thesis_break"
                      ? "⚠ THESIS BREAK"
                      : signal.classification.charAt(0).toUpperCase() +
                        signal.classification.slice(1)}
                  </span>
                  {signal.strength && (
                    <span className="text-xs text-neutral-400">
                      • {signal.strength}
                    </span>
                  )}
                  <span className="text-xs text-neutral-400 ml-auto">
                    {new Date(signal.detected_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm font-medium mb-0.5">{signal.title}</div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {signal.summary}
                </p>
                {signal.source_url && (
                  <a
                    href={signal.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                  >
                    {signal.source_name || "Source"} →
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-8 text-center">
            <p className="text-sm text-neutral-500">
              Monitoring hasn&apos;t run yet. Signals will appear here once your
              thematic is being tracked.
            </p>
          </div>
        )}
      </section>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-neutral-200">
        <Link href={`/thematic/${thematic.id}/research`}>
          <Button>Continue researching</Button>
        </Link>
        {positions.length > 0 && (
          <Button variant="secondary" onClick={handleAddToPortfolio} disabled={addingToPortfolio}>
            {addingToPortfolio ? "Adding…" : "Add to portfolio"}
          </Button>
        )}
        {isMonitored ? (
          <Button variant="secondary" disabled>
            ✓ Monitoring active
          </Button>
        ) : (
          <Button variant="secondary" onClick={handleActivate} disabled={activating}>
            {activating ? "Activating…" : "Activate monitoring"}
          </Button>
        )}
      </div>
    </div>
  );
}
