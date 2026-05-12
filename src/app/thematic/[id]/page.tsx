import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Header } from "@/components/layout/Header";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ThematicDashboard } from "@/components/thematics/ThematicDashboard";

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

export default async function ThematicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <>
        <Header />
        <Container className="py-20">
          <p className="text-neutral-500">Please sign in to view thematics.</p>
          <Link href="/auth/login">
            <Button className="mt-4">Sign in</Button>
          </Link>
        </Container>
      </>
    );
  }

  // Fetch thematic
  const { data: thematic, error: thematicError } = await supabase
    .from("thematics")
    .select("*")
    .eq("id", id)
    .single();

  if (thematicError || !thematic) {
    notFound();
  }

  // Fetch all related data in parallel
  const [nodesResult, positionsResult, contrarianResult, monitoringResult, signalsResult] =
    await Promise.all([
      supabase
        .from("causal_nodes")
        .select("*")
        .eq("thematic_id", id)
        .order("order_index"),
      supabase
        .from("positions")
        .select("*")
        .eq("thematic_id", id),
      supabase
        .from("contrarian_cases")
        .select("*")
        .eq("thematic_id", id),
      supabase
        .from("monitoring_queries")
        .select("*")
        .eq("thematic_id", id)
        .eq("is_active", true),
      supabase
        .from("signals")
        .select("id, title, summary, classification, strength, source_url, source_name, detected_at")
        .eq("thematic_id", id)
        .order("detected_at", { ascending: false })
        .limit(10),
    ]);

  const causalNodes: CausalNode[] = nodesResult.data || [];
  const positions: Position[] = positionsResult.data || [];
  const contrarianCases: ContrarianCase[] = contrarianResult.data || [];
  const monitoringQueries: MonitoringQuery[] = monitoringResult.data || [];
  const signals: Signal[] = signalsResult.data || [];

  // Determine health from latest signal distribution
  const health = getThematicHealth(thematic.status, signals);

  return (
    <>
      <Header />
      <Container className="py-12">
        <ThematicDashboard
          thematic={thematic}
          causalNodes={causalNodes}
          positions={positions}
          contrarianCases={contrarianCases}
          monitoringQueries={monitoringQueries}
          signals={signals}
          health={health}
        />
      </Container>
    </>
  );
}

function getThematicHealth(
  status: string,
  signals: Signal[]
): "strengthening" | "stable" | "under_pressure" | "breaking" {
  if (status === "broken") return "breaking";

  if (signals.length === 0) return "stable";

  const recent = signals.slice(0, 10);
  const confirming = recent.filter((s) => s.classification === "confirming").length;
  const challenging = recent.filter((s) => s.classification === "challenging").length;
  const breaks = recent.filter((s) => s.classification === "thesis_break").length;

  if (breaks > 0) return "breaking";
  if (challenging > confirming + 1) return "under_pressure";
  if (confirming > challenging + 1) return "strengthening";
  return "stable";
}
