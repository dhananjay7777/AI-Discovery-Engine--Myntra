import { NextResponse } from "next/server";
import { computeCorpusStats } from "@/lib/store/read";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = computeCorpusStats();
    return NextResponse.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
