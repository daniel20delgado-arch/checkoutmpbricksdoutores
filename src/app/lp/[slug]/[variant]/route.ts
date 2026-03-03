import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: { slug: string; variant: string } }
) {
  const { slug, variant } = context.params;

  const filePath = path.join(
    process.cwd(),
    "landingpages",
    slug,
    variant,
    "index.html"
  );

  try {
    const content = await fs.readFile(filePath, "utf-8");
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60"
      }
    });
  } catch {
    return new NextResponse("Landing page não encontrada.", {
      status: 404
    });
  }
}

