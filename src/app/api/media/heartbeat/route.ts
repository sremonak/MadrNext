import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { z } from "zod";

const schema = z.object({
  playbackSessionId: z.string().min(8),
  lessonId: z.string().min(10),
  positionSeconds: z.number().int().min(0).max(86_400),
  completed: z.boolean().optional(),
});

/**
 * POST /api/media/heartbeat
 * Keeps the playback session alive, stores resume position, and (on completion)
 * marks lesson progress. Heartbeats also make concurrent-session detection
 * accurate: sessions without heartbeats for 90s are considered ended.
 */
export async function POST(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ ok: false }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const { playbackSessionId, lessonId, positionSeconds, completed } = parsed.data;

  const session = await prisma.playbackSession.findFirst({
    where: { id: playbackSessionId, userId: ctx.user.id, revokedAt: null, endedAt: null },
  });
  if (!session) return NextResponse.json({ ok: false, ended: true }, { status: 410 });

  await prisma.playbackSession.update({
    where: { id: session.id },
    data: { lastHeartbeatAt: new Date() },
  });

  // access log (throttled by client to ~15s)
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  await prisma.assetAccessLog.create({
    data: {
      userId: ctx.user.id,
      assetType: "VIDEO",
      assetId: lessonId,
      action: "HEARTBEAT",
      ip,
      appSessionId: ctx.sessionId,
    },
  });

  // progress upsert
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { moduleId: true, module: { select: { courseId: true } } },
  });
  if (lesson) {
    const courseId = lesson.module.courseId;
    const access = await prisma.enrollment.findFirst({
      where: { userId: ctx.user.id, courseId, status: "ACTIVE" },
    });
    if (access) {
      const isDone = completed === true || positionSeconds >= (await lessonDuration(lessonId)) - 15;
      await prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId: ctx.user.id, lessonId } },
        create: {
          userId: ctx.user.id,
          lessonId,
          enrollmentId: access.id,
          positionSeconds,
          completedAt: isDone ? new Date() : null,
        },
        update: {
          positionSeconds,
          lastViewedAt: new Date(),
          completedAt: isDone ? new Date() : undefined,
        },
      });
      await prisma.enrollment.update({
        where: { id: access.id },
        data: { lastActivityAt: new Date() },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

async function lessonDuration(lessonId: string): Promise<number> {
  const l = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { durationSeconds: true, videoAsset: { select: { durationSeconds: true } } },
  });
  return l?.videoAsset?.durationSeconds || l?.durationSeconds || 600;
}
