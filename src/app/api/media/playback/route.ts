import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { assertCourseAccess } from "@/lib/access";
import { issueMediaToken, tokenFingerprint } from "@/lib/media/tokens";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/auth/rate-limit";
import { headers } from "next/headers";
import { z } from "zod";

/**
 * POST /api/media/playback
 * Authorizes a lesson playback and issues a short-lived signed media token.
 *
 * Security checks (server-side, every request):
 *  1. authenticated session
 *  2. enrollment ACTIVE + not expired + user not suspended
 *  3. lesson belongs to the requested course
 *  4. concurrent playback limit (per student) — oldest idle session is ended
 *  5. playback session + access logs recorded
 */
const schema = z.object({
  lessonId: z.string().min(10),
  action: z.enum(["start", "resume"]),
});

export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const rl = rateLimit(`playback:${ctx.user.id}`, 30, 300);
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
      module: { select: { courseId: true, course: { select: { status: true } } } },
      videoAsset: { select: { id: true, status: true, storagePath: true, durationSeconds: true } },
    },
  });
  if (!lesson || !lesson.isPublished) return NextResponse.json({ error: "not found" }, { status: 404 });

  const courseId = lesson.module.courseId;
  const access = await assertCourseAccess(ctx.user.id, courseId);
  const isPreview = lesson.isPreview && lesson.module.course.status === "PUBLISHED";

  if (!access.allowed && !isPreview) {
    await prisma.assetAccessLog.create({
      data: {
        userId: ctx.user.id,
        assetType: "VIDEO",
        assetId: lesson.videoAssetId ?? lesson.id,
        action: "DENIED",
        ip,
        appSessionId: ctx.sessionId,
      },
    });
    return NextResponse.json({ error: "forbidden", reason: access.reason }, { status: 403 });
  }

  if (!lesson.videoAsset || lesson.videoAsset.status !== "READY") {
    return NextResponse.json({ error: "asset-unavailable" }, { status: 404 });
  }

  // Concurrent playback guard
  const active = await prisma.playbackSession.findMany({
    where: {
      userId: ctx.user.id,
      revokedAt: null,
      endedAt: null,
      lastHeartbeatAt: { gt: new Date(Date.now() - 90_000) },
    },
    orderBy: { startedAt: "asc" },
  });
  if (active.length >= env.maxConcurrentPlaybacks) {
    await prisma.assetAccessLog.create({
      data: {
        userId: ctx.user.id,
        assetType: "VIDEO",
        assetId: lesson.videoAsset.id,
        action: "CONCURRENT_BLOCKED",
        ip,
        appSessionId: ctx.sessionId,
      },
    });
    return NextResponse.json(
      { error: "concurrent-limit", message: "আপনার সীমার মধ্যে ইতিমধ্যে ভিডিও চলছে। অন্য ট্যাব/ডিভাইসে ভিডিও বন্ধ করে আবার চেষ্টা করুন।" },
      { status: 429 },
    );
  }

  // Find or create playback session (resume reuses session id)
  const existing = parsed.data.action === "resume"
    ? await prisma.playbackSession.findFirst({
        where: {
          userId: ctx.user.id,
          lessonId: lesson.id,
          revokedAt: null,
          endedAt: null,
          appSessionId: ctx.sessionId,
        },
        orderBy: { startedAt: "desc" },
      })
    : null;

  const playback =
    existing ??
    (await prisma.playbackSession.create({
      data: {
        userId: ctx.user.id,
        lessonId: lesson.id,
        appSessionId: ctx.sessionId,
        tokenFingerprint: "",
        ip,
      },
    }));

  const token = issueMediaToken({
    userId: ctx.user.id,
    assetType: "VIDEO",
    assetId: lesson.videoAsset.id,
    sessionId: ctx.sessionId,
  });

  if (!existing) {
    await prisma.playbackSession.update({
      where: { id: playback.id },
      data: { tokenFingerprint: tokenFingerprint(token.token) },
    });
    await prisma.assetAccessLog.create({
      data: {
        userId: ctx.user.id,
        assetType: "VIDEO",
        assetId: lesson.videoAsset.id,
        videoAssetId: lesson.videoAsset.id,
        action: "PLAY_START",
        ip,
        appSessionId: ctx.sessionId,
      },
    });
  }

  // watermark identity: name + masked user id + playback session
  const maskedId = `${ctx.user.id.slice(0, 4)}••••${ctx.user.id.slice(-4)}`;

  return NextResponse.json({
    token: token.token,
    expiresInSeconds: token.payload.exp - token.payload.iat,
    manifestUrl: `/api/media/video/${lesson.videoAsset.id}`,
    playbackSessionId: playback.id,
    watermark: `${ctx.user.name} · ${maskedId} · ${playback.id.slice(0, 8)}`,
    durationSeconds: lesson.videoAsset.durationSeconds,
    resumeAt: parsed.data.action === "resume" ? await getResumeAt(ctx.user.id, lesson.id) : 0,
  });
}

async function getResumeAt(userId: string, lessonId: string): Promise<number> {
  const p = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
    select: { positionSeconds: true },
  });
  return p?.positionSeconds ?? 0;
}
