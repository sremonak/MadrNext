import Link from "next/link";
import { prisma } from "@/lib/db";
import { Badge, Pagination, Card } from "@/components/ui";
import { bnDigits, formatDateBn } from "@/lib/format";
import { SearchInput } from "./search-input";
import { requirePagePermission } from "@/lib/auth/rbac";
import { requireAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "শিক্ষার্থী ব্যবস্থাপনা" };

const PAGE_SIZE = 15;

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await requireAuth();
  requirePagePermission(ctx, "students.view");
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const where = {
    role: "STUDENT" as const,
    ...(sp.status === "ACTIVE" || sp.status === "SUSPENDED" || sp.status === "PENDING_VERIFICATION"
      ? { status: sp.status as "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION" }
      : {}),
    ...(sp.q
      ? {
          OR: [
            { name: { contains: sp.q, mode: "insensitive" as const } },
            { email: { contains: sp.q, mode: "insensitive" as const } },
            { phone: { contains: sp.q } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        studentProfile: { select: { level: true, classNumber: true, studentId: true } },
        _count: { select: { enrollments: { where: { status: "ACTIVE" } }, sessions: { where: { revokedAt: null } } } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <h1 className="display text-[26px] font-bold text-ink">শিক্ষার্থী ব্যবস্থাপনা</h1>
      <p className="mt-1.5 text-[14px] text-muted">
        মোট {bnDigits(total)} শিক্ষার্থী — প্রোফাইল, এনরোলমেন্ট ও স্ট্যাটাস নিয়ন্ত্রণ।
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <SearchInput defaultValue={sp.q ?? ""} />
        <div className="flex gap-2">
          {[
            { key: "", label: "সব" },
            { key: "ACTIVE", label: "সক্রিয়" },
            { key: "SUSPENDED", label: "স্থগিত" },
          ].map((t) => (
            <Link
              key={t.key}
              href={`/admin/students${sp.q ? `?q=${encodeURIComponent(sp.q)}${t.key ? `&status=${t.key}` : ""}` : t.key ? `?status=${t.key}` : ""}`}
              className={
                (sp.status ?? "") === t.key
                  ? "rounded-full bg-teal px-4 py-1.5 text-[13px] font-semibold text-white"
                  : "rounded-full border border-line-strong px-4 py-1.5 text-[13px] text-muted"
              }
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <Card className="mt-5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-paper text-[12px] text-muted">
                <th className="px-4 py-3 font-medium">শিক্ষার্থী</th>
                <th className="px-4 py-3 font-medium">শ্রেণি</th>
                <th className="px-4 py-3 font-medium">কোর্স</th>
                <th className="px-4 py-3 font-medium">সেশন</th>
                <th className="px-4 py-3 font-medium">যোগদান</th>
                <th className="px-4 py-3 font-medium">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <Link href={`/admin/students/${u.id}`} className="font-semibold text-ink hover:text-teal">
                      {u.name}
                    </Link>
                    <p className="text-[12px] text-muted">{u.email ?? u.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {u.studentProfile
                      ? `${u.studentProfile.level === "DAKHIL" ? "দাখিল" : u.studentProfile.level === "ALIM" ? "আলিম" : "জেনারেল"} ${bnDigits(u.studentProfile.classNumber ?? 0)}`
                      : "—"}
                  </td>
                  <td className="tabnum px-4 py-3 text-ink">{bnDigits(u._count.enrollments)}</td>
                  <td className="tabnum px-4 py-3 text-muted">{bnDigits(u._count.sessions)}</td>
                  <td className="px-4 py-3 text-muted">{formatDateBn(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    {u.status === "ACTIVE" && <Badge tone="success">সক্রিয়</Badge>}
                    {u.status === "SUSPENDED" && <Badge tone="danger">স্থগিত</Badge>}
                    {u.status === "PENDING_VERIFICATION" && <Badge tone="warn">অযাচাইকৃত</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Pagination page={page} total={totalPages} makeHref={(p) => `/admin/students?page=${p}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}${sp.status ? `&status=${sp.status}` : ""}`} />
    </div>
  );
}
