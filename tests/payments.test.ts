import { afterAll, describe, expect, it } from "vitest";
import {
  approveManualPayment,
  createPayment,
  enrollFree,
  markPaymentVerifiedByGateway,
  newInvoiceNo,
  refundPayment,
  validateCoupon,
} from "../src/lib/payments/service";
import { makeCourse, makeStudent, prisma, uniq } from "./helpers";

describe("purchase & payment activation", () => {
  const emails: string[] = [];
  const courseIds: string[] = [];

  async function fixture(pricePaisa: number) {
    const student = await makeStudent();
    const course = await makeCourse({ pricePaisa });
    if (student.email) emails.push(student.email);
    courseIds.push(course.id);
    return { student, course };
  }

  it("manual payment: create → PENDING_REVIEW → approve → PAID + ACTIVE enrollment (idempotent)", async () => {
    const { student, course } = await fixture(150_000); // ৳1500
    const payment = await createPayment({
      userId: student.id,
      courseId: course.id,
      method: "MANUAL",
      senderNumber: "01712345678",
      manualTxnId: uniq("TXN"),
    });
    expect(payment.status).toBe("PENDING_REVIEW");
    expect(payment.invoiceNo).toMatch(/^MN-/);

    const admin = await prisma.user.create({
      data: { email: uniq("admin") + "@test.local", name: "অ্যাডমিন", passwordHash: "x", role: "ADMIN", status: "ACTIVE" },
    });
    if (admin.email) emails.push(admin.email);

    const approved = await approveManualPayment(payment.id, admin.id);
    expect(approved.status).toBe("PAID");
    expect(approved.verifiedAt).not.toBeNull();
    expect(approved.verifiedBy).toBe(admin.id);

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
    });
    expect(enrollment?.status).toBe("ACTIVE");

    // idempotent: approving twice must not duplicate events or break
    const again = await approveManualPayment(payment.id, admin.id);
    expect(again.status).toBe("PAID");
    const events = await prisma.paymentEvent.count({ where: { paymentId: payment.id } });
    expect(events).toBeGreaterThanOrEqual(1);
  });

  it("gateway verification path: PAID only server-side, idempotent", async () => {
    const { student, course } = await fixture(90_000);
    const payment = await createPayment({ userId: student.id, courseId: course.id, method: "BKASH" });
    const paid = await markPaymentVerifiedByGateway(payment.id, "gw-ref-123");
    expect(paid.status).toBe("PAID");
    const twice = await markPaymentVerifiedByGateway(payment.id, "gw-ref-123");
    expect(twice.status).toBe("PAID");
    expect(twice.id).toBe(payment.id);
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
    });
    expect(enrollment?.status).toBe("ACTIVE");
  });

  it("free course enrollment is instant and idempotent", async () => {
    const { student, course } = await fixture(0);
    await enrollFree(student.id, course.id);
    await enrollFree(student.id, course.id); // second call must not throw/duplicate
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
    });
    expect(enrollment?.status).toBe("ACTIVE");
    const payments = await prisma.payment.count({ where: { userId: student.id, courseId: course.id } });
    expect(payments).toBe(0);
  });

  it("coupon: percent, fixed, and invalid states", async () => {
    const { course } = await fixture(100_000); // ৳1000
    const code = uniq("CPN");
    await prisma.coupon.create({
      data: { code, type: "PERCENT", value: 15, isActive: true, minAmountPaisa: 0 },
    });
    const ok = await validateCoupon(code, course.id, 100_000);
    expect(ok.ok).toBe(true);
    expect(ok.discountPaisa).toBe(15_000);

    await prisma.coupon.update({ where: { code }, data: { isActive: false } });
    const inactive = await validateCoupon(code, course.id, 100_000);
    expect(inactive.ok).toBe(false);

    const unknown = await validateCoupon(uniq("NOPE"), course.id, 100_000);
    expect(unknown.ok).toBe(false);

    // below minimum amount
    const minCode = uniq("MIN");
    await prisma.coupon.create({
      data: { code: minCode, type: "FIXED_PAISA", value: 20_000, isActive: true, minAmountPaisa: 90_000 },
    });
    const tooSmall = await validateCoupon(minCode, course.id, 50_000);
    expect(tooSmall.ok).toBe(false);
    // fixed discount never exceeds the base price
    const capCode = uniq("CAP");
    await prisma.coupon.create({
      data: { code: capCode, type: "FIXED_PAISA", value: 20_000, isActive: true, minAmountPaisa: 0 },
    });
    const capped = await validateCoupon(capCode, course.id, 10_000);
    expect(capped.ok).toBe(true);
    expect(capped.discountPaisa).toBe(10_000);
  });

  it("refund records status and amount", async () => {
    const { student, course } = await fixture(50_000);
    const admin = await prisma.user.create({
      data: { email: uniq("admin") + "@test.local", name: "অ্যাডমিন", passwordHash: "x", role: "SUPER_ADMIN", status: "ACTIVE" },
    });
    if (admin.email) emails.push(admin.email);
    const payment = await createPayment({ userId: student.id, courseId: course.id, method: "MANUAL" });
    await approveManualPayment(payment.id, admin.id);
    const refunded = await refundPayment(payment.id, admin.id, 50_000);
    expect(refunded.status).toBe("REFUNDED");
    expect(refunded.refundedAt).not.toBeNull();
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: student.id, courseId: course.id } },
    });
    expect(["EXPIRED", "REVOKED"]).toContain(enrollment?.status);
  });

  it("invoice numbers are unique", () => {
    const set = new Set(Array.from({ length: 50 }, () => newInvoiceNo()));
    expect(set.size).toBe(50);
  });

  afterAll(async () => {
    await prisma.paymentEvent.deleteMany({ where: { payment: { course: { id: { in: courseIds } } } } });
    await prisma.payment.deleteMany({ where: { courseId: { in: courseIds } } });
    await prisma.enrollment.deleteMany({ where: { courseId: { in: courseIds } } });
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
    await prisma.coupon.deleteMany({ where: { code: { contains: "CPN-" } } });
    await prisma.coupon.deleteMany({ where: { OR: [{ code: { contains: "MIN-" } }, { code: { contains: "CAP-" } }] } });
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.notification.deleteMany({ where: { user: { email: { in: emails } } } });
  });
});
