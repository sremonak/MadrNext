import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { verifyMediaToken } from "@/lib/media/tokens";
import { resolveStoragePath } from "@/lib/storage";

/**
 * GET /api/media/video/[assetId]?t=<signed-token>&f=<hls-file>
 * Serves HLS manifest + segments ONLY with a valid signed token.
 * - The manifest is rewritten so every segment URL carries the same token.
 * - No storage paths, no directory listing, no cache.
 * - Tokens expire (MEDIA_TOKEN_TTL_SECONDS, default 120s).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;
  const url = new URL(req.url);
  const token = url.searchParams.get("t") ?? "";
  const file = url.searchParams.get("f") ?? "master.m3u8";

  const result = verifyMediaToken(token, env.authSecret);
  if (!result.valid || result.payload.typ !== "VIDEO") {
    return NextResponse.json({ error: "invalid token" }, { status: 403 });
  }
  if (result.payload.aid !== assetId) {
    return NextResponse.json({ error: "token/asset mismatch" }, { status: 403 });
  }

  // Verify the playback session is still valid (not revoked; heartbeat fresh)
  const playback = await prisma.playbackSession.findFirst({
    where: {
      userId: result.payload.sub,
      revokedAt: null,
      endedAt: null,
      tokenFingerprint: { not: "" },
    },
    orderBy: { startedAt: "desc" },
    select: { id: true, lastHeartbeatAt: true },
  });
  if (playback && Date.now() - playback.lastHeartbeatAt.getTime() > 5 * 60_000) {
    return NextResponse.json({ error: "playback ended" }, { status: 403 });
  }

  const asset = await prisma.videoAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.status !== "READY") {
    return NextResponse.json({ error: "asset not found" }, { status: 404 });
  }

  // Path safety: only allow files inside the asset's own hls directory
  const safeFile = path.normalize(file).replace(/^(\.\.(\/|\\|$))+/, "");
  const assetPath = resolveStoragePath(asset.storagePath);
  if (!assetPath) {
    return NextResponse.json({ error: "forbidden path" }, { status: 403 });
  }
  const assetDir = path.dirname(assetPath);
  const filePath = path.join(assetDir, safeFile);
  if (!filePath.startsWith(assetDir)) {
    return NextResponse.json({ error: "forbidden path" }, { status: 403 });
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");

    if (file.endsWith(".m3u8")) {
      // Rewrite manifest: every URI gets the signed token attached.
      const raw = await readFile(filePath, "utf8");
      const rewritten = raw
        .split("\n")
        .map((line) => {
          const t = line.trim();
          if (!t || t.startsWith("#")) return line;
          return `/api/media/video/${assetId}?t=${encodeURIComponent(token)}&f=${encodeURIComponent(t)}`;
        })
        .join("\n");
      return new NextResponse(rewritten, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store, private",
        },
      });
    }

    const data = await readFile(filePath);
    const ext = path.extname(file).toLowerCase();
    const contentType =
      ext === ".ts"
        ? "video/mp2t"
        : ext === ".m4s" || ext === ".mp4"
          ? "video/iso.segment"
          : ext === ".vtt"
            ? "text/vtt"
            : "application/octet-stream";
    return new NextResponse(data as unknown as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, private",
        "Content-Length": String(info.size),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "asset file missing" }, { status: 404 });
  }
}
