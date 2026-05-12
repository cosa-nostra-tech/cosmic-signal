import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      horizonMonths,
      riskTolerance,
      maxConcentration,
      maxSinglePosition,
      markets,
      vehicleTypes,
    } = body as {
      userId: string;
      horizonMonths: number;
      riskTolerance: "conservative" | "moderate" | "aggressive";
      maxConcentration: number;
      maxSinglePosition: number;
      markets: string[];
      vehicleTypes: string[];
    };

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Verify the authenticated user matches
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use service role for writes (bypasses RLS for server-side)
    const { createServerClient } = await import("@supabase/ssr");
    const serviceClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() { return []; },
          setAll() {},
        },
      }
    );

    // 1. Upsert risk_params (check if exists, then insert or update)
    const { data: existingRisk } = await serviceClient
      .from("risk_params")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingRisk) {
      const { error } = await serviceClient
        .from("risk_params")
        .update({
          horizon_months: horizonMonths,
          risk_tolerance: riskTolerance,
          max_concentration_pct: maxConcentration,
          max_single_position_pct: maxSinglePosition,
        })
        .eq("user_id", userId);
      if (error) {
        console.error("risk_params update error:", error);
        return NextResponse.json({ error: "Failed to update risk params" }, { status: 500 });
      }
    } else {
      const { error } = await serviceClient.from("risk_params").insert({
        user_id: userId,
        horizon_months: horizonMonths,
        risk_tolerance: riskTolerance,
        max_concentration_pct: maxConcentration,
        max_single_position_pct: maxSinglePosition,
      });
      if (error) {
        console.error("risk_params insert error:", error);
        return NextResponse.json({ error: "Failed to save risk params" }, { status: 500 });
      }
    }

    // 2. Upsert market_access
    const { data: existingMarket } = await serviceClient
      .from("market_access")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingMarket) {
      const { error } = await serviceClient
        .from("market_access")
        .update({ markets, vehicle_types: vehicleTypes })
        .eq("user_id", userId);
      if (error) {
        console.error("market_access update error:", error);
        return NextResponse.json({ error: "Failed to update market access" }, { status: 500 });
      }
    } else {
      const { error } = await serviceClient.from("market_access").insert({
        user_id: userId,
        markets,
        vehicle_types: vehicleTypes,
      });
      if (error) {
        console.error("market_access insert error:", error);
        return NextResponse.json({ error: "Failed to save market access" }, { status: 500 });
      }
    }

    // 3. Mark onboarding complete
    const { error: profileError } = await serviceClient
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", userId);

    if (profileError) {
      console.error("profile update error:", profileError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Onboarding API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
