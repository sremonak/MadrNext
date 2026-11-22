import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/rbac";

/** CSV transaction report export (payment managers only). */
export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx || !hasPermission(ctx, "payments.export")) {
    return new Response("forbidden", { status: 403 });
  }
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { titleBn: true } },
    },
    take: 5000,
  });

  const esc = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["Invoice", "Student", "Email", "Course", "AmountBDT", "Method", "Status", "ManualTxnID", "GatewayRef", "CreatedAt"].join(","),
    ...payments.map((p) =>
      [
        p.invoiceNo,
        p.user.name,
        p.user.email ?? "",
        p.course.titleBn,
        (p.amountPaisa / 100).toFixed(2),
        p.method,
        p.status,
        p.manualTxnId ?? "",
        p.gatewayRef ?? "",
        p.createdAt.toISOString(),
      ]
        .map(esc)
        .join(","),
    ),
  ].join("\n");

  return new Response("\uFEFF" + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="madrnext-payments-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
