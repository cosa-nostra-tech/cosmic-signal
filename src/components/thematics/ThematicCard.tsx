import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Container } from "@/components/layout/Container";
import { Header } from "@/components/layout/Header";

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

export function ThematicCard({
  id,
  title,
  thesis,
  health,
  signalCount,
}: ThematicCardProps) {
  return (
    <Link href={`/thematic/${id}`}>
      <Card className="hover:bg-neutral-100 transition-colors duration-200 cursor-pointer">
        <h3 className="text-lg font-semibold tracking-tight mb-2">
          {title}
        </h3>
        <p className="text-sm text-neutral-500 leading-relaxed line-clamp-2 mb-4">
          {thesis}
        </p>
        <div className="flex items-center gap-3">
          <Pill variant="solid">{healthLabels[health]}</Pill>
          <span className="text-xs text-neutral-400">
            {signalCount} signal{signalCount !== 1 ? "s" : ""}
          </span>
        </div>
      </Card>
    </Link>
  );
}
