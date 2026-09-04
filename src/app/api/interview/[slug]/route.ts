import { NextResponse } from "next/server";
import { getArea, interviewMarkdown } from "@/lib/web/data";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const area = getArea(slug);
  if (!area) {
    return NextResponse.json({ error: "Unknown opportunity" }, { status: 404 });
  }
  return new NextResponse(interviewMarkdown(area), {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-interview-guide.md"`,
    },
  });
}
