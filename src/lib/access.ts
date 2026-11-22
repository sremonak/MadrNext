import "server-only";
import { prisma } from "@/lib/db";
import type { EnrollmentStatus } from "@/generated/prisma/client";

/**
 * Course access control — the security heart of the product.
 * Every protected request MUST call these helpers; frontend visibility alone
 * is never trusted. Direct URLs cannot bypass authorization.
 */

export interface CourseAccess {
  allowed: boolean;
  reason:
    | "OK"
    | "NOT_ENROLLED"
    | "PENDING"
    | "EXPIRED"
    | "SUSPENDED"
    | "REVOKED"
    | "USER_SUSPENDED";
  enrollmentId?: string;
}

/** Authoritative check: is this user allowed to learn this course right now? */
export async function assertCourseAccess(
  userId: string,
  courseId: string,
): Promise<CourseAccess> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  if (!user) return { allowed: false, reason: "NOT_ENROLLED" };
  if (user.status === "SUSPENDED") return { allowed: false, reason: "USER_SUSPENDED" };

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) return { allowed: false, reason: "NOT_ENROLLED" };

  switch (enrollment.status as EnrollmentStatus) {
    case "ACTIVE": {
      if (enrollment.accessExpiresAt && enrollment.accessExpiresAt < new Date()) {
        return { allowed: false, reason: "EXPIRED" };
      }
      return { allowed: true, reason: "OK", enrollmentId: enrollment.id };
    }
    case "PENDING":
      return { allowed: false, reason: "PENDING", enrollmentId: enrollment.id };
    case "EXPIRED":
      return { allowed: false, reason: "EXPIRED", enrollmentId: enrollment.id };
    case "SUSPENDED":
      return { allowed: false, reason: "SUSPENDED", enrollmentId: enrollment.id };
    case "REVOKED":
      return { allowed: false, reason: "REVOKED", enrollmentId: enrollment.id };
    default:
      return { allowed: false, reason: "REVOKED", enrollmentId: enrollment.id };
  }
}

/** Throws unless access is allowed — use in server actions & route handlers. */
export async function requireCourseAccess(userId: string, courseId: string): Promise<string> {
  const res = await assertCourseAccess(userId, courseId);
  if (!res.allowed) {
    throw new AccessDeniedError(res.reason);
  }
  return res.enrollmentId!;
}

export class AccessDeniedError extends Error {
  constructor(public reason: string) {
    super(`access denied: ${reason}`);
  }
}

/** Free-preview check: published courses expose preview lessons to anyone. */
export async function isPreviewLesson(lessonId: string): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { isPreview: true, isPublished: true, module: { select: { course: { select: { status: true } } } } },
  });
  if (!lesson) return false;
  return lesson.isPreview && lesson.isPublished && lesson.module.course.status === "PUBLISHED";
}
