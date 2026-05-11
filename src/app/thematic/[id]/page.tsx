import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Container } from "@/components/layout/Container";
import { Header } from "@/components/layout/Header";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

// TODO: Fetch real thematic from Supabase by ID
export default function ThematicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // We'll unwrap params async in the real implementation
  // For now, placeholder

  return (
    <>
      <Header />
      <Container className="py-16">
        <div className="mb-8">
          <Pill variant="solid">↑ Strengthening</Pill>
          <h1 className="text-3xl font-semibold tracking-tight mt-3 mb-2">
            AI Supply Chain Upstream
          </h1>
          <p className="text-neutral-500 leading-relaxed max-w-2xl">
            AI compute demand is doubling every 4 months. The bottleneck isn't
            chips — it's the upstream materials and infrastructure that make
            chips possible. From uranium enrichment to rare earth processing to
            advanced packaging, the supply chain is constrained at every node.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">
              Causal Chain
            </h2>
            <p className="text-sm text-neutral-500">
              Driver → Mechanism → Outcome decomposition. Not yet built — start a
              research conversation to create your causal chain.
            </p>
            <div className="mt-4 flex gap-2">
              <Pill variant="solid">AI compute demand ↑</Pill>
              <Pill variant="dashed">→</Pill>
              <Pill variant="dashed">Chip fabrication capacity</Pill>
              <Pill variant="dashed">→</Pill>
              <Pill variant="solid">Upstream materials shortage</Pill>
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">
              Positions
            </h2>
            <p className="text-sm text-neutral-500">
              Investment vehicles to express this thesis. Not yet mapped.
            </p>
          </Card>

          <Card>
            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-4">
              Recent Signals
            </h2>
            <p className="text-sm text-neutral-500">
              Monitoring engine hasn't run yet. Signals will appear here once
              your thematic is active.
            </p>
          </Card>

          <div className="flex gap-3">
            <Link href={`/thematic/demo-ai-upstream/research`}>
              <Button>Research this thesis</Button>
            </Link>
            <Button variant="secondary">Activate monitoring</Button>
          </div>
        </div>
      </Container>
    </>
  );
}