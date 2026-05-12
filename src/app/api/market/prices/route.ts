import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers");

  if (!tickersParam) {
    return NextResponse.json({ error: "tickers query param required" }, { status: 400 });
  }

  const tickers = tickersParam
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);

  if (tickers.length === 0) {
    return NextResponse.json({ error: "no valid tickers" }, { status: 400 });
  }

  if (tickers.length > 50) {
    return NextResponse.json({ error: "max 50 tickers per request" }, { status: 400 });
  }

  try {
    const scriptPath = process.cwd() + "/scripts/fetch-live-prices.py";
    const { stdout, stderr } = await execFileAsync("python3", [scriptPath, ...tickers], {
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });

    if (stderr && !stdout) {
      console.error("Price script stderr:", stderr);
      return NextResponse.json({ error: "Price fetch failed" }, { status: 500 });
    }

    const data = JSON.parse(stdout);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Market prices API error:", err);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
