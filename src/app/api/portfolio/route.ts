import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/portfolio — list user's holdings
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: holdings, error } = await supabase
    .from("portfolio_holdings")
    .select("id, ticker, vehicle_type, shares, avg_cost, source, source_thematic_id, created_at")
    .eq("user_id", user.id)
    .order("ticker");

  if (error) {
    console.error("Portfolio fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch holdings" }, { status: 500 });
  }

  return NextResponse.json({ holdings });
}

// POST /api/portfolio — add a holding
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ticker, vehicleType, shares, avgCost, source, sourceThematicId } = body as {
    ticker: string;
    vehicleType?: string;
    shares?: number;
    avgCost?: number;
    source?: string;
    sourceThematicId?: string;
  };

  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { createServerClient } = await import("@supabase/ssr");
  const serviceClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return []; }, setAll() {} } }
  );

  // Check if ticker already exists for user
  const { data: existing } = await serviceClient
    .from("portfolio_holdings")
    .select("id, shares, avg_cost, source, source_thematic_id")
    .eq("user_id", user.id)
    .eq("ticker", ticker.toUpperCase())
    .maybeSingle();

  if (existing) {
    // Update: merge source info
    const updateData: Record<string, unknown> = {};
    if (shares !== undefined) updateData.shares = (existing.shares || 0) + shares;
    if (avgCost !== undefined) updateData.avg_cost = avgCost;
    if (source === "thematic" && sourceThematicId && existing.source !== "thematic") {
      updateData.source = "thematic";
      updateData.source_thematic_id = sourceThematicId;
    }

    if (Object.keys(updateData).length > 0) {
      const { error } = await serviceClient
        .from("portfolio_holdings")
        .update(updateData)
        .eq("id", existing.id);
      if (error) {
        console.error("Portfolio update error:", error);
        return NextResponse.json({ error: "Failed to update holding" }, { status: 500 });
      }
    }

    return NextResponse.json({ id: existing.id, action: "updated" });
  }

  // Insert new
  const { data, error } = await serviceClient
    .from("portfolio_holdings")
    .insert({
      user_id: user.id,
      ticker: ticker.toUpperCase(),
      vehicle_type: vehicleType || "equity",
      shares: shares || 0,
      avg_cost: avgCost || null,
      source: source || "direct",
      source_thematic_id: sourceThematicId || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Portfolio insert error:", error);
    return NextResponse.json({ error: "Failed to add holding" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, action: "created" });
}

// DELETE /api/portfolio — remove a holding
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { createServerClient } = await import("@supabase/ssr");
  const serviceClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return []; }, setAll() {} } }
  );

  const { error } = await serviceClient
    .from("portfolio_holdings")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Portfolio delete error:", error);
    return NextResponse.json({ error: "Failed to remove holding" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
