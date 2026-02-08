import { NextRequest, NextResponse } from "next/server";

const VALID_INTERVALS = [
  "1_MINUTE",
  "5_MINUTE",
  "15_MINUTE",
  "1_HOUR",
  "4_HOUR",
  "1_DAY",
  "1_WEEK",
] as const;

type Interval = (typeof VALID_INTERVALS)[number];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mint = params.get("mint");
  const interval = (params.get("interval") ?? "1_HOUR") as Interval;
  const quote = params.get("quote") ?? "usd";
  const candles = Math.min(Number(params.get("candles") ?? 300), 1000);

  if (!mint) {
    return NextResponse.json({ error: "mint is required" }, { status: 400 });
  }

  if (!VALID_INTERVALS.includes(interval)) {
    return NextResponse.json(
      { error: `Invalid interval. Use: ${VALID_INTERVALS.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const to = Date.now();
    const url = `https://datapi.jup.ag/v2/charts/${mint}?interval=${interval}&to=${to}&candles=${candles}&type=price&quote=${quote}`;
    const res = await fetch(url);

    if (!res.ok) {
      return NextResponse.json(
        { error: "Jupiter chart API error" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Chart fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 }
    );
  }
}
