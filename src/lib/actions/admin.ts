"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";
import { audit } from "@/lib/audit";
import { approveManualPayment, rejectPayment, refundPayment } from "@/lib/payments/service";
import { revokeSessionById, revokeAllSessions } from "@/lib/auth/session";
import { notify } from "@/lib/notify";
import { hashPassword } from "@/lib/auth/password";

async function requirePerm(permission: string) {
  const ctx = await getAuthContext();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (!ctx || !hasPermission(ctx, permission)) {
    throw new Error("অনুমতি নেই");
  }
  return { ctx, ip };
}

function fail(e: unknown): string {
  return e instanceof Error ? e.message : "কাজ সম্পন্ন হয়নি";
}

// ── Students ────────────────────────────────────────────────────────────────

export async function setStudentStatusAction(userId: string, status: "ACTIVE" | "SUSPENDED", reason?: string): Promise<string | null> {
  try {
    const { ctx, ip } = await requirePerm("students.manage");
    if (userId === ctx.user.id) return "নিজের অ্যাকাউন্ট স্থগিত করা যাবে না";
    await prisma.user.update({
      where: { id: userId, role: "STUDENT" },
      data: {
        status,
        ...(status === "SUSPENDED" ? { suspendedAt: new Date(), suspensionReason: reason ?? "ADMIN_ACTION" } : { suspendedAt: null, suspensionReason: null }),
      },
    });
    if (status === "SUSPENDED") {
      await revokeAllSessions(userId, "ACCOUNT_SUSPENDED");
      await notify({
        userId,
        type: "SECURITY_ALERT",
        titleBn: "অ্যাকাউন্ট স্থগিত",
        bodyBn: reason ?? "নীতিমালা লঙ্ঘনের কারণে আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে। সাপোর্টে যোগাযোগ করুন।",
      });
      await audit({
        actorId: ctx.user.id, actorRole: ctx.user.role, action: "STUDENT_SUSPENDED",
        entityType: "User", entityId: userId, metadata: { reason }, ip,
      });
    } else {
      await audit({
        actorId: ctx.user.id, actorRole: ctx.user.role, action: "STUDENT_REACTIVATED",
        entityType: "User", entityId: userId, ip,
      });
    }
    revalidatePath("/admin/students");
    revalidatePath(`/admin/students/${userId}`);
    return null;
  } catch (e) {
    return fail(e);
  }
}

export async function grantCourseAccessAction(userId: string, courseId: string, note?: string): Promise<string | null> {
  try {
    const { ctx, ip } = await requirePerm("students.manage");
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId, status: "ACTIVE", source: "MANUAL_GRANT", grantedBy: ctx.user.id },
      update: { status: "ACTIVE", grantedBy: ctx.user.id, accessExpiresAt: null },
    });
    await notify({
      userId,
      type: "ENROLLMENT",
      titleBn: "কোর্সে অ্যাক্সেস প্রদান করা হয়েছে",
      bodyBn: note ?? "প্রতিষ্ঠান কর্তৃক আপনার কোর্সে অ্যাক্সেস চালু করা হয়েছে।",
      linkUrl: "/learn",
    });
    await audit({
      actorId: ctx.user.id, actorRole: ctx.user.role, action: "COURSE_ACCESS_GRANTED",
      entityType: "Enrollment", entityId: `${userId}:${courseId}`, ip,
    });
    revalidatePath(`/admin/students/${userId}`);
    return null;
  } catch (e) {
    return fail(e);
  }
}

export async function revokeCourseAccessAction(userId: string, courseId: string, reason?: string): Promise<string | null> {
  try {
    const { ctx, ip } = await requirePerm("students.manage");
    await prisma.enrollment.updateMany({
      where: { userId, courseId },
      data: { status: "REVOKED" },
    });
    await audit({
      actorId: ctx.user.id, actorRole: ctx.user.role, action: "COURSE_ACCESS_REVOKED",
      entityType: "Enrollment", entityId: `${userId}:${courseId}`, metadata: { reason }, ip,
    });
    revalidatePath(`/admin/students/${userId}`);
    return null;
  } catch (e) {
    return fail(e);
  }
}

// ── Payments ────────────────────────────────────────────────────────────────

export async function approvePaymentAction(paymentId: string): Promise<string | null> {
  try {
    const { ctx, ip } = await requirePerm("payments.approve");
    await approveManualPayment(paymentId, ctx.user.id, ip);
    revalidatePath("/admin/payments");
    return null;
  } catch (e) {
    return fail(e);
  }
}

export async function rejectPaymentAction(paymentId: string, reason: string): Promise<string | null> {
  try {
    const { ctx, ip } = await requirePerm("payments.reject");
    await rejectPayment(paymentId, ctx.user.id, reason, ip);
    revalidatePath("/admin/payments");
    return null;
  } catch (e) {
    return fail(e);
  }
}

export async function refundPaymentAction(paymentId: string, refundPaisa: number): Promise<string | null> {
  try {
    const { ctx, ip } = await requirePerm("payments.refund");
    await refundPayment(paymentId, ctx.user.id, refundPaisa, ip);
    revalidatePath("/admin/payments");
    return null;
  } catch (e) {
    return fail(e);
  }
}

// ── Sessions / devices ──────────────────────────────────────────────────────

export async function revokeSessionAdminAction(sessionId: string): Promise<string | null> {
  try {
    const { ctx, ip } = await requirePerm("sessions.revoke");
    await revokeSessionById(sessionId, "ADMIN_REVOKED");
    await audit({
      actorId: ctx.user.id, actorRole: ctx.user.role, action: "SESSION_REVOKED",
      entityType: "Session", entityId: sessionId, ip,
    });
    revalidatePath("/admin/sessions");
    return null;
  } catch (e) {
    return fail(e);
  }
}

export async function revokeAllUserSessionsAction(userId: string): Promise<string | null> {
  try {
    const { ctx, ip } = await requirePerm("sessions.revoke");
    const count = await revokeAllSessions(userId, "ADMIN_FORCE_LOGOUT");
    await audit({
      actorId: ctx.user.id, actorRole: ctx.user.role, action: "FORCE_LOGOUT",
      entityType: "User", entityId: userId, metadata: { revoked: count }, ip,
    });
    revalidatePath("/admin/sessions");
    return null;
  } catch (e) {
    return fail(e);
  }
}

// ── Courses ─────────────────────────────────────────────────────────────────

const courseSchema = z.object({
  titleBn: z.string().trim().min(4, "শিরোনাম কমপক্ষে ৪ অক্ষর"),
  titleEn: z.string().trim().min(4, "English title required"),
  subtitleBn: z.string().trim().max(220).optional().or(z.literal("").transform(() => undefined)),
  descriptionBn: z.string().trim().max(8000).optional().or(z.literal("").transform(() => undefined)),
  categoryId: z.string().min(10),
  subjectId: z.string().optional().or(z.literal("").transform(() => undefined)),
  instructorId: z.string().optional().or(z.literal("").transform(() => undefined)),
  level: z.enum(["DAKHIL", "ALIM", "GENERAL"]),
  classNumber: z.coerce.number().int().min(9).max(12).optional(),
  priceTaka: z.coerce.number().int().min(0).max(1_000_000),
  discountTaka: z.coerce.number().int().min(0).max(1_000_000).optional(),
  isFeatured: z.coerce.boolean().optional(),
  hasCertificate: z.coerce.boolean().optional(),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "course";
}

export async function createCourseAction(_prev: unknown, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  try {
    const { ctx, ip } = await requirePerm("courses.manage");
    const parsed = courseSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ফর্ম ভুল" };
    const d = parsed.data;
    const slug = `${slugify(d.titleEn)}-${Math.random().toString(36).slice(2, 6)}`;
    const course = await prisma.course.create({
      data: {
        slug,
        titleBn: d.titleBn,
        titleEn: d.titleEn,
        subtitleBn: d.subtitleBn ?? null,
        descriptionBn: d.descriptionBn ?? null,
        categoryId: d.categoryId,
        subjectId: d.subjectId ?? null,
        instructorId: d.instructorId ?? null,
        level: d.level,
        classNumber: d.classNumber ?? null,
        pricePaisa: d.priceTaka * 100,
        discountPaisa: d.discountTaka ? d.discountTaka * 100 : null,
        isFeatured: d.isFeatured ?? false,
        hasCertificate: d.hasCertificate ?? false,
        status: "DRAFT",
        thumbnailSeed: Math.floor(Math.random() * 6) + 1,
        createdBy: ctx.user.id,
      },
    });
    await audit({
      actorId: ctx.user.id, actorRole: ctx.user.role, action: "COURSE_CREATED",
      entityType: "Course", entityId: course.id, metadata: { title: d.titleBn }, ip,
    });
    revalidatePath("/admin/courses");
    return { ok: true };
  } catch (e) {
    return { error: fail(e) };
  }
}

export async function updateCourseAction(courseId: string, data: {
  priceTaka?: number; discountTaka?: number | null; isFeatured?: boolean; status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  enrollmentLimit?: number | null;
}): Promise<string | null> {
  try {
    const { ctx, ip } = await requirePerm("courses.manage");
    const course = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...(data.priceTaka !== undefined ? { pricePaisa: data.priceTaka * 100 } : {}),
        ...(data.discountTaka !== undefined ? { discountPaisa: data.discountTaka === null ? null : data.discountTaka * 100 } : {}),
        ...(data.isFeatured !== undefined ? { isFeatured: data.isFeatured } : {}),
        ...(data.status !== undefined
          ? { status: data.status, publishedAt: data.status === "PUBLISHED" ? new Date() : undefined }
          : {}),
        ...(data.enrollmentLimit !== undefined ? { enrollmentLimit: data.enrollmentLimit } : {}),
      },
    });
    await audit({
      actorId: ctx.user.id, actorRole: ctx.user.role,
      action: data.status === "PUBLISHED" ? "COURSE_PUBLISHED" : "COURSE_UPDATED",
      entityType: "Course", entityId: courseId, metadata: data as never, ip,
    });
    revalidatePath("/admin/courses");
    revalidatePath(`/courses/${course.slug}`);
    return null;
  } catch (e) {
    return fail(e);
  }
}

export async function addModuleAction(courseId: string, titleBn: string): Promise<string | null> {
  try {
    const { ctx, ip } = await requirePerm("courses.manage");
    const count = await prisma.courseModule.count({ where: { courseId } });
    await prisma.courseModule.create({ data: { courseId, titleBn, order: count + 1 } });
    await audit({
      actorId: ctx.user.id, actorRole: ctx.user.role, action: "MODULE_ADDED",
      entityType: "CourseModule", entityId: courseId, metadata: { titleBn, order: count + 1 }, ip,
    });
    revalidatePath(`/admin/courses/${courseId}`);
    return null;
  } catch (e) {
    return fail(e);
  }
}

export async function addLessonAction(input: {
  moduleId: string; titleBn: string; type: "VIDEO" | "DOCUMENT" | "TEXT"; contentBn?: string; isPreview?: boolean;
}): Promise<string | null> {
  try {
    const { ctx, ip } = await requirePerm("courses.manage");
    const count = await prisma.lesson.count({ where: { moduleId: input.moduleId } });
    const modRow = await prisma.courseModule.findUnique({ where: { id: input.moduleId }, select: { courseId: true } });
    if (!modRow) return "মডিউল পাওয়া যায়নি";

    let videoAssetId: string | undefined;
    let documentAssetId: string | undefined;
    let durationSeconds = 0;

    if (input.type === "VIDEO") {
      // Attach the pre-rendered sample HLS asset for this lesson slot.
      const asset = await prisma.videoAsset.findFirst({ where: { status: "READY", storagePath: { startsWith: `videos/sample-${(count % 3) + 1}` } } });
      if (asset) {
        videoAssetId = asset.id;
        durationSeconds = asset.durationSeconds;
      }
    }
    if (input.type === "DOCUMENT") {
      const doc = await prisma.documentAsset.findFirst({ where: { status: "READY", storagePath: { startsWith: `documents/sample-${(count % 3) + 1}` } } });
      if (doc) documentAssetId = doc.id;
    }

    await prisma.lesson.create({
      data: {
        moduleId: input.moduleId,
        titleBn: input.titleBn,
        type: input.type,
        contentBn: input.contentBn ?? null,
        order: count + 1,
        isPreview: input.isPreview ?? false,
        videoAssetId,
        documentAssetId,
        durationSeconds,
      },
    });
    // keep course duration fresh
    const lessons = await prisma.lesson.findMany({
      where: { module: { courseId: modRow.courseId } },
      select: { durationSeconds: true },
    });
    await prisma.course.update({
      where: { id: modRow.courseId },
      data: { durationMinutes: Math.round(lessons.reduce((s, l) => s + l.durationSeconds, 0) / 60) },
    });
    await audit({
      actorId: ctx.user.id, actorRole: ctx.user.role, action: "LESSON_ADDED",
      entityType: "Lesson", entityId: input.moduleId, metadata: { titleBn: input.titleBn, type: input.type }, ip,
    });
    revalidatePath(`/admin/courses/${modRow.courseId}`);
    return null;
  } catch (e) {
    return fail(e);
  }
}

// ── Admin users (Super Admin only) ──────────────────────────────────────────

const adminSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(10, "অ্যাডমিন পাসওয়ার্ড কমপক্ষে ১০ অক্ষর"),
  role: z.enum(["SUPPORT_AGENT", "PAYMENT_MANAGER", "COURSE_MANAGER", "ADMIN"]),
  designation: z.string().trim().max(80).optional().or(z.literal("").transform(() => undefined)),
});

export async function createAdminAction(_prev: unknown, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  try {
    const { ctx, ip } = await requirePerm("admins.manage");
    const parsed = adminSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ফর্ম ভুল" };
    const d = parsed.data;
    const exists = await prisma.user.findUnique({ where: { email: d.email } });
    if (exists) return { error: "এই ইমেইলে ইতিমধ্যে অ্যাকাউন্ট আছে" };

    await prisma.user.create({
      data: {
        name: d.name,
        email: d.email,
        passwordHash: await hashPassword(d.password),
        role: d.role,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        adminProfile: { create: { designation: d.designation ?? null } },
      },
    });
    await audit({
      actorId: ctx.user.id, actorRole: ctx.user.role, action: "ADMIN_CREATED",
      entityType: "User", entityId: d.email, metadata: { role: d.role }, ip,
    });
    revalidatePath("/admin/admins");
    return { ok: true };
  } catch (e) {
    return { error: fail(e) };
  }
}

export async function setAdminRoleAction(userId: string, role: string): Promise<string | null> {
  try {
    const { ctx, ip } = await requirePerm("admins.manage");
    const allowed = ["SUPPORT_AGENT", "PAYMENT_MANAGER", "COURSE_MANAGER", "ADMIN", "SUPER_ADMIN"];
    if (!allowed.includes(role)) return "অবৈধ রোল";
    await prisma.user.update({ where: { id: userId, role: { not: "STUDENT" } }, data: { role: role as never } });
    await audit({
      actorId: ctx.user.id, actorRole: ctx.user.role, action: "ADMIN_ROLE_CHANGED",
      entityType: "User", entityId: userId, metadata: { role }, ip,
    });
    revalidatePath("/admin/admins");
    return null;
  } catch (e) {
    return fail(e);
  }
}

// ── Content management ──────────────────────────────────────────────────────

export async function saveFaqAction(_prev: unknown, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  try {
    await requirePerm("content.manage");
    const id = String(formData.get("id") ?? "");
    const data = {
      questionBn: String(formData.get("questionBn") ?? "").trim(),
      answerBn: String(formData.get("answerBn") ?? "").trim(),
      category: String(formData.get("category") ?? "general"),
      order: parseInt(String(formData.get("order") ?? "0"), 10) || 0,
      isActive: formData.get("isActive") === "on",
    };
    if (!data.questionBn || !data.answerBn) return { error: "প্রশ্ন ও উত্তর দিন" };
    if (id) await prisma.faq.update({ where: { id }, data });
    else await prisma.faq.create({ data });
    revalidatePath("/admin/content");
    revalidatePath("/faq");
    return { ok: true };
  } catch (e) {
    return { error: fail(e) };
  }
}

export async function saveTestimonialAction(_prev: unknown, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  try {
    await requirePerm("content.manage");
    const id = String(formData.get("id") ?? "");
    const data = {
      nameBn: String(formData.get("nameBn") ?? "").trim(),
      nameEn: String(formData.get("nameEn") ?? "").trim(),
      roleBn: String(formData.get("roleBn") ?? "").trim(),
      quoteBn: String(formData.get("quoteBn") ?? "").trim(),
      order: parseInt(String(formData.get("order") ?? "0"), 10) || 0,
      isActive: formData.get("isActive") === "on",
    };
    if (!data.nameBn || !data.quoteBn) return { error: "নাম ও উদ্ধৃতি দিন" };
    if (id) await prisma.testimonial.update({ where: { id }, data });
    else await prisma.testimonial.create({ data });
    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { error: fail(e) };
  }
}

export async function saveAnnouncementAction(_prev: unknown, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  try {
    const { ctx } = await requirePerm("content.manage");
    const data = {
      titleBn: String(formData.get("titleBn") ?? "").trim(),
      bodyBn: String(formData.get("bodyBn") ?? "").trim(),
      courseId: String(formData.get("courseId") ?? "") || null,
      isPublished: formData.get("isPublished") === "on",
    };
    if (!data.titleBn || !data.bodyBn) return { error: "শিরোনাম ও বিষয়বস্তু দিন" };
    await prisma.announcement.create({
      data: { ...data, createdBy: ctx.user.id, publishedAt: new Date() },
    });
    // notify enrolled students
    if (data.courseId) {
      const students = await prisma.enrollment.findMany({ where: { courseId: data.courseId, status: "ACTIVE" }, select: { userId: true } });
      for (const s of students) {
        await notify({ userId: s.userId, type: "LESSON_ANNOUNCEMENT", titleBn: data.titleBn, bodyBn: data.bodyBn.slice(0, 160) });
      }
    }
    revalidatePath("/admin/content");
    revalidatePath("/learn");
    return { ok: true };
  } catch (e) {
    return { error: fail(e) };
  }
}

export async function deleteContentAction(entity: "Faq" | "Testimonial" | "Announcement", id: string): Promise<string | null> {
  try {
    const { ctx, ip } = await requirePerm("content.manage");
    if (entity === "Faq") await prisma.faq.delete({ where: { id } });
    else if (entity === "Testimonial") await prisma.testimonial.delete({ where: { id } });
    else await prisma.announcement.delete({ where: { id } });
    await audit({
      actorId: ctx.user.id, actorRole: ctx.user.role, action: `CONTENT_DELETED`,
      entityType: entity, entityId: id, ip,
    });
    revalidatePath("/admin/content");
    return null;
  } catch (e) {
    return fail(e);
  }
}

export async function saveContactStatusAction(id: string, status: "READ" | "REPLIED"): Promise<string | null> {
  try {
    await requirePerm("contact.manage");
    await prisma.contactMessage.update({ where: { id }, data: { status } });
    revalidatePath("/admin/contact");
    return null;
  } catch (e) {
    return fail(e);
  }
}

// ── Site settings ───────────────────────────────────────────────────────────

export async function saveSettingsAction(_prev: unknown, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  try {
    const { ctx } = await requirePerm("settings.view");
    // Only SUPER_ADMIN can change critical settings
    if (ctx.user.role !== "SUPER_ADMIN") {
      const canManage = await prisma.siteSettings.findFirst({ where: { key: "allow_admin_settings_edit" } });
      if (!canManage) return { error: "শুধু Super Admin সেটিংস পরিবর্তন করতে পারেন" };
    }
    const entries: Record<string, string> = {
      siteNameBn: String(formData.get("siteNameBn") ?? "").trim(),
      supportPhone: String(formData.get("supportPhone") ?? "").trim(),
      supportEmail: String(formData.get("supportEmail") ?? "").trim(),
      manualPaymentNumber: String(formData.get("manualPaymentNumber") ?? "").trim(),
      maxConcurrentSessions: String(formData.get("maxConcurrentSessions") ?? "3"),
      maxConcurrentPlaybacks: String(formData.get("maxConcurrentPlaybacks") ?? "2"),
      sessionTtlHours: String(formData.get("sessionTtlHours") ?? "72"),
    };
    for (const [key, value] of Object.entries(entries)) {
      if (!value) continue;
      await prisma.siteSettings.upsert({
        where: { key },
        create: { key, value: value as never, updatedBy: ctx.user.id },
        update: { value: value as never, updatedBy: ctx.user.id },
      });
    }
    await audit({
      actorId: ctx.user.id, actorRole: ctx.user.role, action: "SETTINGS_UPDATED",
      metadata: { keys: Object.keys(entries).filter((k) => entries[k]) }, ip: null,
    });
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    return { error: fail(e) };
  }
}
