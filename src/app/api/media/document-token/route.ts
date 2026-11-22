import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { assertCourseAccess } from "@/lib/access";
import { issueMediaToken } from "@/lib/media/tokens";
import { rateLimit } from "@/lib/auth/rate-limit";
import { z } from "zod";

/**
 * POST /api/media/document-token { lessonId }
 * Issues a short-lived signed token for reading a course PDF in the browser
 * viewer. Access = ACTIVE enrollment on the lesson's course (backend-verified).
 */
const schema = z.object({ lessonId: z.string().min(10) });

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const rl = rateLimit(`doctoken:${ctx.user.id}`, 60, 300);
  if (!rl.ok) return NextResponse.json({ error: "rate-limited" }, { status: 429 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const lesson = await prisma.lesson.findUnique({
    where: { id: parsed.data.lessonId },
    include: {
      module: { select: { courseId: true } },
      documentAsset: { select: { id: true, status: true, pageCount: true } },
    },
  });
  if (!lesson || !lesson.documentAsset || lesson.documentAsset.status !== "READY") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const access = await assertCourseAccess(ctx.user.id, lesson.module.courseId);
  if (!access.allowed) return NextResponse.json({ error: "forbidden", reason: access.reason }, { status: 403 });

  const token = issueMediaToken({
    userId: ctx.user.id,
    assetType: "DOCUMENT",
    assetId: lesson.documentAsset.id,
    sessionId: ctx.sessionId,
  });

  const h = await headers();
  await prisma.assetAccessLog.create({
    data: {
      userId: ctx.user.id,
      assetType: "DOCUMENT",
      assetId: lesson.documentAsset.id,
      documentAssetId: lesson.documentAsset.id,
      action: "TOKEN_ISSUED",
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
      appSessionId: ctx.sessionId,
    },
  });

  return NextResponse.json({
    token: token.token,
    documentUrl: `/api/media/document?t=${encodeURIComponent(token.token)}`,
    pageCount: lesson.documentAsset.pageCount,
    watermark: `${ctx.user.name} · ${ctx.user.id.slice(0, 4)}••••${ctx.user.id.slice(-4)}`,
  });
}
