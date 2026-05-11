import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Container } from "@/components/layout/Container";
import { Header } from "@/components/layout/Header";

// TODO: Fetch real brief from Supabase by ID
export default function BriefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <>
      <Header />
      <Container className="py-16">
        <div className="mb-8">
          <Pill variant="solid">↑ Strengthening</Pill>
          <h1 className="text-3xl font-semibold tracking-tight mt-3 mb-2">
            Weekly Brief
          </h1>
          <p className="text-neutral-500">
            AI Supply Chain Upstream · Week of May 5–11, 2026
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-3">
              Overview
            </h2>
            <p className="text-sm text-neutral-500 leading-relaxed">
              Your thesis on AI upstream supply chain constraints is
              strengthening this week. Three confirming signals detected.
              No thesis-breaking events.
            </p>
          </Card>

          <Card>
            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-3">
              Signal Summary
            </h2>
            <p className="text-sm text-neutral-500">
              3 confirming · 1 challenging · 8 neutral
            </p>
          </Card>

          <Card>
            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-3">
              Action Items
            </h2>
            <p className="text-sm text-neutral-500">
              Weekly briefs will suggest specific actions once the
              Evolution Engine is connected.
            </p>
          </Card>

          <Card>
            <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-3">
              Contrarian Check
            </h2>
            <p className="text-sm text-neutral-500">
              What would break this thesis? Contrarian analysis coming
              with the Evolution Engine.
            </p>
          </Card>
        </div>
      </Container>
    </>
  );
}