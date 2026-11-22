import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyMediaToken } from "@/lib/media/tokens";
import { resolveStoragePath } from "@/lib/storage";

/**
 * GET /api/media/document?t=<signed-token>
 * Streams a lesson PDF only with a valid signed DOCUMENT token bound to the
 * requesting student. Inline disposition (view, not download), no-store, and
 * storage paths are resolved strictly inside the storage root.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? "";

  const result = verifyMediaToken(token, env.authSecret);
  if (!result.valid || result.payload.typ !== "DOCUMENT") {
    return NextResponse.json({ error: "অবৈধ বা মেয়াদোত্তীর্ণ টোকেন" }, { status: 403 });
  }

  const asset = await prisma.documentAsset.findUnique({
    where: { id: result.payload.aid },
    select: { storagePath: true, status: true },
  });
  if (!asset || asset.status !== "READY") {
    return NextResponse.json({ error: "ফাইল পাওয়া যায়নি" }, { status: 404 });
  }

  const abs = resolveStoragePath(asset.storagePath);
  if (!abs) return NextResponse.json({ error: "অবৈধ পথ" }, { status: 400 });

  let size = 0;
  try {
    const st = await stat(abs);
    if (!st.isFile()) throw new Error("not a file");
    size = st.size;
  } catch {
    return NextResponse.json({ error: "ফাইল পাওয়া যায়নি" }, { status: 404 });
  }

  const data = await readFile(abs);
  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(size),
      "Cache-Control": "no-store, must-revalidate",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
