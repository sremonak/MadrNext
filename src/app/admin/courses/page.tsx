import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge, Card } from "@/components/ui";
import { bnDigits, formatTaka } from "@/lib/format";
import { requireAuth } from "@/lib/auth/session";

import { hasPermission } from "@/lib/auth/rbac";
import { CreateCourseForm } from "./course-form";
import { requirePagePermission } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";
export const metadata = { title: "কোর্স ব্যবস্থাপনা" };

export default async function AdminCoursesPage() {
  const ctx = await requireAuth();
  requirePagePermission(ctx, "courses.view");
  const canManage = hasPermission(ctx, "courses.manage");

  const [courses, categories, subjects, teachers] = await Promise.all([
    prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        instructor: { select: { nameBn: true } },
        modules: { where: { isPublished: true }, select: { _count: { select: { lessons: true } } } },
        _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
      },
    }),
    prisma.courseCategory.findMany({ orderBy: { order: "asc" } }),
    prisma.subject.findMany({ orderBy: { order: "asc" } }),
    prisma.teacherProfile.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="display text-[26px] font-bold text-ink">কোর্স ব্যবস্থাপনা</h1>
      <p className="mt-1.5 text-[14px] text-muted">
        কোর্স তৈরি, মূল্য/ডিসকাউন্ট, প্রকাশ ও সিলেবাস নিয়ন্ত্রণ।
      </p>

      {canManage && (
        <details className="mt-5 rounded-lg border border-line bg-surface">
          <summary className="cursor-pointer list-none px-5 py-4 text-[14.5px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
            + নতুন কোর্স তৈরি করুন
          </summary>
          <div className="border-t border-line p-5">
            <CreateCourseForm
              categories={categories.map((c) => ({ id: c.id, nameBn: c.nameBn, level: c.level }))}
              subjects={subjects.map((s) => ({ id: s.id, nameBn: s.nameBn, level: s.level }))}
              teachers={teachers.map((t) => ({ id: t.id, nameBn: t.nameBn }))}
            />
          </div>
        </details>
      )}

      <Card className="mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-paper text-[12px] text-muted">
                <th className="px-4 py-3 font-medium">কোর্স</th>
                <th className="px-4 py-3 font-medium">লেভেল</th>
                <th className="px-4 py-3 font-medium">পাঠ</th>
                <th className="px-4 py-3 font-medium">এনরোল</th>
                <th className="px-4 py-3 font-medium">মূল্য</th>
                <th className="px-4 py-3 font-medium">স্ট্যাটাস</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{c.titleBn}</p>
                    <p className="text-[11.5px] text-muted">{c.instructor?.nameBn ?? "শিক্ষক নির্বাচিত নয়"}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {c.level === "DAKHIL" ? "দাখিল" : c.level === "ALIM" ? "আলিম" : "জেনারেল"}
                    {c.classNumber ? ` ${bnDigits(c.classNumber)}` : ""}
                  </td>
                  <td className="tabnum px-4 py-3 text-muted">{bnDigits(c.modules.reduce((sum, m) => sum + m._count.lessons, 0))}</td>
                  <td className="tabnum px-4 py-3 text-muted">{bnDigits(c._count.enrollments)}</td>
                  <td className="tabnum px-4 py-3">
                    <span className="font-semibold text-ink">{formatTaka(c.discountPaisa ?? c.pricePaisa)}</span>
                    {c.discountPaisa !== null && c.discountPaisa < c.pricePaisa && (
                      <p className="text-[11px] text-muted line-through">{formatTaka(c.pricePaisa)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.status === "PUBLISHED" && <Badge tone="success">প্রকাশিত</Badge>}
                    {c.status === "DRAFT" && <Badge tone="warn">খসড়া</Badge>}
                    {c.status === "ARCHIVED" && <Badge tone="neutral">আর্কাইভ</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/courses/${c.id}`} className="text-[13px] font-semibold text-teal">
                      সিলেবাস ও সেটিংস →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
