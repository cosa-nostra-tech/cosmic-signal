import { ThematicCard } from "@/components/thematics/ThematicCard";

export function DemoThematic() {
  return (
    <div>
      <ThematicCard
        id="demo-ai-upstream"
        title="AI Supply Chain Upstream"
        thesis="AI compute demand is doubling every 4 months. The bottleneck isn't chips — it's the upstream materials and infrastructure that make chips possible."
        health="strengthening"
        signalCount={12}
      />
      <p className="mt-4 text-xs text-neutral-400">
        This is a sample thematic. Sign in to build your own.
      </p>
    </div>
  );
}
