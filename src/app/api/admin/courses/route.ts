import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";

/** Staff-only: minimal course list for admin pickers. */
export async function GET(req: Request) {
  const ctx = await getAuthContext();
  if (!ctx || !hasPermission(ctx, "students.manage")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const publishedOnly = url.searchParams.get("published") === "1";
  const courses = await prisma.course.findMany({
    where: publishedOnly ? { status: "PUBLISHED" } : {},
    select: { id: true, titleBn: true, status: true },
    orderBy: { titleBn: "asc" },
  });
  return NextResponse.json({ courses });
}
