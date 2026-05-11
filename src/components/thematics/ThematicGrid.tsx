import { ThematicCard } from "./ThematicCard";

interface Thematic {
  id: string;
  title: string;
  thesis: string;
  health: "strengthening" | "stable" | "under_pressure" | "breaking";
  signalCount: number;
}

interface ThematicGridProps {
  thematics: Thematic[];
}

export function ThematicGrid({ thematics }: ThematicGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {thematics.map((t) => (
        <ThematicCard key={t.id} {...t} />
      ))}
    </div>
  );
}
