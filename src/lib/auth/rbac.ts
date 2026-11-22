import "server-only";
import { redirect } from "next/navigation";
import type { AuthContext } from "@/lib/auth/session";
import type { Role } from "@/generated/prisma/client";

/**
 * Granular permissions per role. `*` = everything.
 * Only Super Admin manages administrators & critical system settings.
 */
const ROLE_PERMISSIONS: Record<Role, string[] | "*"> = {
  STUDENT: [],
  SUPPORT_AGENT: [
    "students.view",
    "payments.view",
    "content.view",
    "contact.view",
  ],
  PAYMENT_MANAGER: [
    "students.view",
    "payments.view",
    "payments.approve",
    "payments.reject",
    "payments.refund",
    "payments.export",
    "coupons.manage",
    "content.view",
    "contact.view",
  ],
  COURSE_MANAGER: [
    "students.view",
    "courses.view",
    "courses.manage",
    "exams.manage",
    "content.view",
    "content.manage",
    "contact.view",
  ],
  ADMIN: [
    "students.view",
    "students.manage",
    "courses.view",
    "courses.manage",
    "payments.view",
    "payments.approve",
    "payments.reject",
    "payments.refund",
    "payments.export",
    "coupons.manage",
    "sessions.view",
    "sessions.revoke",
    "content.view",
    "content.manage",
    "exams.manage",
    "audit.view",
    "contact.view",
    "contact.manage",
    "settings.view",
  ],
  SUPER_ADMIN: "*",
};

export function hasPermission(ctx: AuthContext | null, permission: string): boolean {
  if (!ctx) return false;
  const { role, status } = ctx.user;
  if (status === "SUSPENDED") return false;
  const set = ROLE_PERMISSIONS[role];
  if (set === "*") return true;
  return set.includes(permission);
}

export function isStaff(ctx: AuthContext | null): boolean {
  if (!ctx) return false;
  return ctx.user.role !== "STUDENT";
}

export function isAdmin(ctx: AuthContext | null): boolean {
  return hasPermission(ctx, "sessions.view"); // any admin-panel role
}

export function requirePermission(ctx: AuthContext | null, permission: string): void {
  if (!hasPermission(ctx, permission)) {
    throw new AuthzError(`এই কাজের জন্য আপনার অনুমতি নেই: ${permission}`);
  }
}

export class AuthzError extends Error {}

/**
 * Page-level guard for admin panel routes. Redirects back to /admin with a
 * denied flag when the current staff user lacks the permission — every admin
 * page must call this before rendering data.
 */
export function requirePagePermission(ctx: AuthContext | null, permission: string): void {
  if (!hasPermission(ctx, permission)) {
    redirect(`/admin?denied=${encodeURIComponent(permission)}`);
  }
}

/** Super-Admin-only page guard (admin management screens). */
export function requireSuperAdminPage(ctx: AuthContext | null): void {
  if (!ctx || ctx.user.role !== "SUPER_ADMIN") {
    redirect("/admin?denied=super_admin");
  }
}

export const ALL_PERMISSIONS = [
  "students.view",
  "students.manage",
  "courses.view",
  "courses.manage",
  "exams.manage",
  "payments.view",
  "payments.approve",
  "payments.reject",
  "payments.refund",
  "payments.export",
  "coupons.manage",
  "sessions.view",
  "sessions.revoke",
  "content.view",
  "content.manage",
  "audit.view",
  "contact.view",
  "contact.manage",
  "settings.view",
  "admins.manage",
] as const;
