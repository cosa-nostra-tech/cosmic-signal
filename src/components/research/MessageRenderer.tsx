"use client";

import { Pill } from "@/components/ui/Pill";
import { ThematicCard } from "@/components/research/ThematicCard";

interface Section {
  type: "thesis" | "causal_chain" | "positions" | "contrarian" | "monitoring" | "text";
  content: string;
}

interface Direction {
  heading: string;
  description: string;
}

export function parseSections(text: string): Section[] {
  const sections: Section[] = [];
  const headerPattern = /^## (Thesis Statement|Causal Chain|Positions|Contrarian Case|Monitoring Queries)/gm;

  const matches: { header: string; index: number }[] = [];
  let match;
  while ((match = headerPattern.exec(text)) !== null) {
    const headerMap: Record<string, Section["type"]> = {
      "Thesis Statement": "thesis",
      "Causal Chain": "causal_chain",
      "Positions": "positions",
      "Contrarian Case": "contrarian",
      "Monitoring Queries": "monitoring",
    };
    matches.push({ header: match[1], index: match.index });
  }

  if (matches.length === 0) {
    return [{ type: "text", content: text }];
  }

  if (matches[0].index > 0) {
    const preText = text.substring(0, matches[0].index).trim();
    if (preText) sections.push({ type: "text", content: preText });
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
    const headerLine = `## ${matches[i].header}`;
    const content = text.substring(start + headerLine.length, end).trim();

    const headerMap: Record<string, Section["type"]> = {
      "Thesis Statement": "thesis",
      "Causal Chain": "causal_chain",
      "Positions": "positions",
      "Contrarian Case": "contrarian",
      "Monitoring Queries": "monitoring",
    };

    sections.push({ type: headerMap[matches[i].header] || "text", content });
  }

  return sections;
}

function tryParseDirections(text: string): Direction[] | null {
  const lines = text.split("\n");
  const directions: Direction[] = [];

  for (const line of lines) {
    const match = line.match(/^\s*[-•]\s+\*\*([^*]+)\*\*:?\s*(.*)/);
    if (match) {
      const heading = match[1].trim().replace(/:$/, "");
      const description = match[2].trim();
      if (heading && description) {
        directions.push({ heading, description });
      }
    }
  }

  if (directions.length >= 2) return directions;
  return null;
}

function renderInlineFormatting(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function formatText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.split("\n").map((line, j) => {
      if (line.startsWith("- ") || line.startsWith("• ")) {
        return (
          <div key={`${i}-${j}`} className="flex gap-2 ml-2">
            <span className="text-neutral-400 mt-0.5">•</span>
            <span>{renderInlineFormatting(line.replace(/^[-•]\s*/, ""))}</span>
          </div>
        );
      }
      return j > 0 ? <br key={`${i}-${j}`} /> : line;
    });
  });
}

function ThesisSection({ content }: { content: string }) {
  return (
    <div className="bg-neutral-900 text-white rounded-2xl p-6">
      <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">
        Thesis Statement
      </div>
      <div className="text-base leading-relaxed">{renderInlineFormatting(content)}</div>
    </div>
  );
}

function CausalChainSection({ content }: { content: string }) {
  const lines = content.split("\n").filter((l) => l.trim().startsWith("-"));
  const nodes: { type: string; label: string; desc: string }[] = [];

  for (const line of lines) {
    const match = line.match(/-\s*\*\*\[([^\]]+)\]\*\*:\s*(.*)/);
    if (match) {
      nodes.push({ type: match[1], label: match[1], desc: match[2].trim() });
    }
  }

  if (nodes.length === 0) {
    return (
      <div className="border border-neutral-200 rounded-2xl p-6">
        <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
          Causal Chain
        </div>
        <div className="text-sm text-neutral-600 whitespace-pre-wrap">{formatText(content)}</div>
      </div>
    );
  }

  const typeColors: Record<string, string> = {
    Driver: "bg-blue-50 text-blue-700 border-blue-200",
    Mechanism: "bg-purple-50 text-purple-700 border-purple-200",
    Outcome: "bg-green-50 text-green-700 border-green-200",
    Risk: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className="border border-neutral-200 rounded-2xl p-6">
      <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
        Causal Chain
      </div>
      <div className="space-y-3">
        {nodes.map((node, i) => (
          <div key={i}>
            <div className="flex items-start gap-3">
              <span
                className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${typeColors[node.type] || "bg-neutral-50 text-neutral-700 border-neutral-200"}`}
              >
                {node.type}
              </span>
              <span className="text-sm text-neutral-700 leading-relaxed flex-1">
                {renderInlineFormatting(node.desc)}
              </span>
            </div>
            {i < nodes.length - 1 && (
              <div className="ml-4 my-1 text-neutral-300">↓</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PositionsSection({ content }: { content: string }) {
  const lines = content.split("\n").filter((l) => l.trim().startsWith("-"));
  const positions: { ticker: string; vehicle: string; rationale: string }[] = [];

  for (const line of lines) {
    const match = line.match(/-\s*\*\*([A-Z.]+)\s*\(([^)]+)\)\*\*:\s*(.*)/);
    if (match) {
      positions.push({
        ticker: match[1].trim(),
        vehicle: match[2].trim(),
        rationale: match[3].trim(),
      });
    }
  }

  if (positions.length === 0) {
    return (
      <div className="border border-neutral-200 rounded-2xl p-6">
        <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
          Positions
        </div>
        <div className="text-sm text-neutral-600 whitespace-pre-wrap">{formatText(content)}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
        Positions
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {positions.map((pos, i) => (
          <div
            key={i}
            className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 hover:border-neutral-300 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold font-mono">{pos.ticker}</span>
              <Pill variant="dashed">{pos.vehicle}</Pill>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {renderInlineFormatting(pos.rationale)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContrarianSection({ content }: { content: string }) {
  return (
    <div className="border border-red-200 bg-red-50/30 rounded-2xl p-6">
      <div className="text-xs font-medium text-red-400 uppercase tracking-wider mb-3">
        Contrarian Case
      </div>
      <div className="text-sm text-neutral-700 leading-relaxed">
        {content.split("\n").map((line, i) => {
          if (line.startsWith("- ") || line.startsWith("• ")) {
            return (
              <div key={i} className="flex gap-2 ml-2 mb-1">
                <span className="text-red-300 mt-0.5">•</span>
                <span>{renderInlineFormatting(line.replace(/^[-•]\s*/, ""))}</span>
              </div>
            );
          }
          return line ? <p key={i} className="mb-2">{renderInlineFormatting(line)}</p> : null;
        })}
      </div>
    </div>
  );
}

function MonitoringSection({ content }: { content: string }) {
  const lines = content.split("\n").filter((l) => l.trim().startsWith("-"));
  const queries: { text: string; meta: string }[] = [];

  for (const line of lines) {
    const match = line.match(/-\s*(.*?)\s*\(([^)]+)\)/);
    if (match) {
      queries.push({ text: match[1].trim(), meta: match[2].trim() });
    } else {
      const clean = line.replace(/^[-•]\s*/, "").trim();
      if (clean) queries.push({ text: clean, meta: "" });
    }
  }

  if (queries.length === 0) {
    return (
      <div className="border border-neutral-200 rounded-2xl p-6">
        <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
          Monitoring Queries
        </div>
        <div className="text-sm text-neutral-600 whitespace-pre-wrap">{formatText(content)}</div>
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 rounded-2xl p-6">
      <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-4">
        Monitoring Queries
      </div>
      <div className="space-y-2">
        {queries.map((q, i) => (
          <div key={i} className="flex items-start gap-3 py-2">
            <span className="text-neutral-300 text-xs mt-0.5 font-mono w-5 text-right">{i + 1}.</span>
            <span className="text-sm text-neutral-700 flex-1">{q.text}</span>
            {q.meta && <Pill variant="dashed">{q.meta}</Pill>}
          </div>
        ))}
      </div>
    </div>
  );
}

interface DirectionsSectionProps {
  directions: Direction[];
  onDirectionSelect?: (direction: Direction) => void;
}

function DirectionsSection({ directions, onDirectionSelect }: DirectionsSectionProps) {
  if (!onDirectionSelect) {
    return (
      <div className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
        {formatText(directions.map((d) => `- **${d.heading}:** ${d.description}`).join("\n"))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
      {directions.map((dir, i) => (
        <ThematicCard
          key={i}
          heading={dir.heading}
          description={dir.description}
          imageUrl=""
          onExpand={() => onDirectionSelect(dir)}
          isExpanded={false}
        />
      ))}
    </div>
  );
}

function TextSection({ content, onDirectionSelect }: { content: string; onDirectionSelect?: (direction: Direction) => void }) {
  const directions = tryParseDirections(content);

  if (directions) {
    return <DirectionsSection directions={directions} onDirectionSelect={onDirectionSelect} />;
  }

  return (
    <div className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
      {formatText(content)}
    </div>
  );
}

interface MessageRendererProps {
  content: string;
  onDirectionSelect?: (direction: Direction) => void;
}

export function MessageRenderer({ content, onDirectionSelect }: MessageRendererProps) {
  const sections = parseSections(content);

  return (
    <div className="space-y-3">
      {sections.map((section, i) => {
        switch (section.type) {
          case "thesis":
            return <ThesisSection key={i} content={section.content} />;
          case "causal_chain":
            return <CausalChainSection key={i} content={section.content} />;
          case "positions":
            return <PositionsSection key={i} content={section.content} />;
          case "contrarian":
            return <ContrarianSection key={i} content={section.content} />;
          case "monitoring":
            return <MonitoringSection key={i} content={section.content} />;
          default:
            return <TextSection key={i} content={section.content} onDirectionSelect={onDirectionSelect} />;
        }
      })}
    </div>
  );
}
