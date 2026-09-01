import { NextResponse } from "next/server";
import { COLLECTIONS, countRuns } from "@/lib/store/read";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const runs = countRuns();
    return NextResponse.json({
      status: "ok",
      store: "json",
      runs,
      collections: COLLECTIONS.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        status: "degraded",
        store: "unavailable",
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
