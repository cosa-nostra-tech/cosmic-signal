import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { thematicId } = await request.json() as { thematicId: string };

    if (!thematicId) {
      return NextResponse.json({ error: "Missing thematicId" }, { status: 400 });
    }

    // Verify auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify ownership
    const { data: thematic } = await supabase
      .from("thematics")
      .select("id, status")
      .eq("id", thematicId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!thematic) {
      return NextResponse.json({ error: "Thematic not found" }, { status: 404 });
    }

    // Use service role for writes
    const { createServerClient } = await import("@supabase/ssr");
    const serviceClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: { getAll() { return []; }, setAll() {} },
      }
    );

    // 1. Set thematic status to active
    const { error: statusError } = await serviceClient
      .from("thematics")
      .update({ status: "active" })
      .eq("id", thematicId);

    if (statusError) {
      console.error("Status update error:", statusError);
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }

    // 2. Activate all monitoring queries for this thematic
    const { error: queriesError } = await serviceClient
      .from("monitoring_queries")
      .update({ is_active: true })
      .eq("thematic_id", thematicId);

    if (queriesError) {
      console.error("Queries update error:", queriesError);
      // Non-fatal — status was set, queries just won't auto-run yet
    }

    return NextResponse.json({ success: true, status: "active" });
  } catch (err) {
    console.error("Activate API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
