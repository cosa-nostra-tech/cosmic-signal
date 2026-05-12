import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";

interface ThematicCardProps {
  id: string;
  title: string;
  thesis: string;
  health: "strengthening" | "stable" | "under_pressure" | "breaking";
  signalCount: number;
}

const healthLabels: Record<ThematicCardProps["health"], string> = {
  strengthening: "↑ Strengthening",
  stable: "● Stable",
  under_pressure: "↓ Under Pressure",
  breaking: "⚠ Breaking",
};

const healthStyles: Record<ThematicCardProps["health"], string> = {
  strengthening: "bg-green-50 text-green-700 border-green-200",
  stable: "bg-neutral-900 text-white border-transparent",
  under_pressure: "bg-amber-50 text-amber-700 border-amber-200",
  breaking: "bg-red-50 text-red-700 border-red-200",
};

export function ThematicCard({
  id,
  title,
  thesis,
  health,
  signalCount,
}: ThematicCardProps) {
  return (
    <Link href={`/thematic/${id}`}>
      <Card className="hover:bg-neutral-100 transition-colors duration-200 cursor-pointer group">
        <h3 className="text-lg font-semibold tracking-tight mb-2 group-hover:text-neutral-700">
          {title}
        </h3>
        <p className="text-sm text-neutral-500 leading-relaxed line-clamp-3 mb-4">
          {thesis}
        </p>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${healthStyles[health]}`}
          >
            {healthLabels[health]}
          </span>
          <span className="text-xs text-neutral-400">
            {signalCount} signal{signalCount !== 1 ? "s" : ""}
          </span>
        </div>
      </Card>
    </Link>
  );
}
