import { createClient } from "@/lib/supabase/server";
import { Container } from "@/components/layout/Container";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { ThematicGrid } from "@/components/thematics/ThematicGrid";
import { DemoThematic } from "@/components/demo/DemoThematic";
import Link from "next/link";

interface Thematic {
  id: string;
  title: string;
  thesis_statement: string;
  status: string;
  confidence: string;
  created_at: string;
  updated_at: string;
}

interface ThematicWithSignalCount extends Thematic {
  signal_count: number;
}

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <Header />
        <Container className="py-20">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight leading-tight mb-4">
              Turn your worldview into investment theses
            </h1>
            <p className="text-lg text-neutral-500 leading-relaxed mb-8">
              Cosmic Signal helps you decompose what you believe about the
              world into causal chains, find the right positions to express
              those beliefs, and then monitors the news for signals that
              confirm or challenge your thesis — so your strategy evolves
              as the world changes.
            </p>
            <Link href="/auth/login">
              <Button>Get started</Button>
            </Link>

            <div className="mt-20">
              <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-6">
                Sample thematic
              </h2>
              <DemoThematic />
            </div>
          </div>
        </Container>
      </>
    );
  }

  // Authenticated: fetch user's thematics
  const { data: thematics, error } = await supabase
    .from("thematics")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  // For each thematic, get signal count
  let thematicsWithSignals: ThematicWithSignalCount[] = [];

  if (thematics && thematics.length > 0) {
    const thematicIds = thematics.map((t: Thematic) => t.id);

    const { data: signalCounts } = await supabase
      .from("signals")
      .select("thematic_id")
      .in("thematic_id", thematicIds);

    const countMap: Record<string, number> = {};
    for (const s of signalCounts || []) {
      const tid = s.thematic_id;
      countMap[tid] = (countMap[tid] || 0) + 1;
    }

    thematicsWithSignals = thematics.map((t: Thematic) => ({
      ...t,
      signal_count: countMap[t.id] || 0,
    }));
  }

  // Map DB status to health display
  const statusToHealth = (status: string): "strengthening" | "stable" | "under_pressure" | "breaking" => {
    switch (status) {
      case "active": return "stable";
      case "paused": return "under_pressure";
      case "broken": return "breaking";
      default: return "stable";
    }
  };

  return (
    <>
      <Header />
      <Container className="py-20">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">
            Your thematics
          </h1>
          <Link href="/thematic/new/research">
            <Button>Start researching</Button>
          </Link>
        </div>

        {thematicsWithSignals.length > 0 ? (
          <ThematicGrid
            thematics={thematicsWithSignals.map((t) => ({
              id: t.id,
              title: t.title,
              thesis: t.thesis_statement,
              health: statusToHealth(t.status),
              signalCount: t.signal_count,
            }))}
          />
        ) : (
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-12 text-center">
            <p className="text-neutral-500 mb-4">
              You haven&apos;t built a thematic yet.
            </p>
            <Link href="/thematic/new/research">
              <Button>Start researching</Button>
            </Link>
          </div>
        )}
      </Container>
    </>
  );
}
