import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    message: "Formation engine not yet connected. Wire Anthropic API to enable AI research conversations.",
  });
}