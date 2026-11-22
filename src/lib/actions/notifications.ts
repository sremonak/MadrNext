"use server";

import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";

export async function markAllReadAction(): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx) return;
  await prisma.notification.updateMany({
    where: { userId: ctx.user.id, readAt: null },
    data: { readAt: new Date() },
  });
}
