import "server-only";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import type { PaymentMethod } from "@/generated/prisma/client";

/**
 * Payment lifecycle. All transitions happen here (server-only):
 *   INITIATED → (gateway/manual) → PENDING_REVIEW → PAID
 *                                  ↘ FAILED / CANCELLED
 *   PAID → REFUNDED (admin, revokes access)
 * PAID transitions MUST go through verify/approve functions that:
 *   - run server-side only
 *   - activate enrollment atomically
 *   - write payment events + notifications + audit records
 */

export function newInvoiceNo(): string {
  const stamp = new Date();
  const y = stamp.getFullYear().toString().slice(2);
  const m = String(stamp.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 900000 + 100000);
  return `MN-${y}${m}-${rand}`;
}

export interface CouponCheckResult {
  ok: boolean;
  message: string;
  discountPaisa: number;
  couponId?: string;
}

export async function validateCoupon(
  code: string,
  courseId: string,
  basePaisa: number,
): Promise<CouponCheckResult> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon || !coupon.isActive) return { ok: false, message: "কুপন কোড সঠিক নয়", discountPaisa: 0 };
  if (coupon.courseId && coupon.courseId !== courseId)
    return { ok: false, message: "এই কুপন এই কোর্সে প্রযোজ্য নয়", discountPaisa: 0 };
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now)
    return { ok: false, message: "কুপনটি এখনো চালু হয়নি", discountPaisa: 0 };
  if (coupon.endsAt && coupon.endsAt < now)
    return { ok: false, message: "কুপনের মেয়াদ শেষ", discountPaisa: 0 };
  if (coupon.maxRedemptions !== null && coupon.redeemedCount >= coupon.maxRedemptions)
    return { ok: false, message: "কুপনের সীমা শেষ", discountPaisa: 0 };
  if (basePaisa < coupon.minAmountPaisa)
    return { ok: false, message: "ন্যূনতম মূল্য পূরণ হয়নি", discountPaisa: 0 };

  const discount =
    coupon.type === "PERCENT"
      ? Math.floor((basePaisa * Math.min(coupon.value, 100)) / 100)
      : Math.min(coupon.value, basePaisa);
  return { ok: true, message: "কুপন প্রয়োগ হয়েছে", discountPaisa: discount, couponId: coupon.id };
}

export interface CreatePaymentInput {
  userId: string;
  courseId: string;
  method: PaymentMethod;
  couponCode?: string | null;
  senderNumber?: string | null;
  manualTxnId?: string | null;
  note?: string | null;
}

export async function createPayment(input: CreatePaymentInput) {
  const course = await prisma.course.findUnique({ where: { id: input.courseId } });
  if (!course) throw new Error("কোর্স পাওয়া যায়নি");
  if (course.status !== "PUBLISHED") throw new Error("কোর্সটি বর্তমানে ভর্তির জন্য খোলা নেই");
  if (course.enrollmentLimit !== null) {
    const count = await prisma.enrollment.count({ where: { courseId: course.id, status: "ACTIVE" } });
    if (count >= course.enrollmentLimit) throw new Error("কোর্সের সিট শেষ হয়ে গেছে");
  }

  const base = course.discountPaisa ?? course.pricePaisa;
  if (base === 0) throw new Error("এটি ফ্রি কোর্স — সরাসরি এনরোল করুন");

  let discountPaisa = 0;
  let couponId: string | undefined;
  if (input.couponCode) {
    const check = await validateCoupon(input.couponCode, course.id, base);
    if (!check.ok) throw new Error(check.message);
    discountPaisa = check.discountPaisa;
    couponId = check.couponId;
  }

  const amount = Math.max(base - discountPaisa, 0);
  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      courseId: course.id,
      amountPaisa: amount,
      discountPaisa,
      method: input.method,
      status: input.method === "MANUAL" ? "PENDING_REVIEW" : "INITIATED",
      couponId,
      senderNumber: input.senderNumber ?? null,
      manualTxnId: input.manualTxnId ?? null,
      note: input.note ?? null,
      invoiceNo: newInvoiceNo(),
    },
  });
  if (couponId) {
    await prisma.coupon.update({ where: { id: couponId }, data: { redeemedCount: { increment: 1 } } });
    await prisma.couponRedemption.create({
      data: { couponId, userId: input.userId, paymentId: payment.id },
    });
  }
  await prisma.paymentEvent.create({
    data: { paymentId: payment.id, type: "INITIATED", payload: { method: input.method, amount } as never },
  });
  return payment;
}

/**
 * THE single gateway-verified activation path (used by webhooks & gateway
 * callbacks after server-side verification).
 */
export async function markPaymentVerifiedByGateway(paymentId: string, gatewayRef: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("পেমেন্ট পাওয়া যায়নি");
  if (payment.status === "PAID") return payment; // idempotent
  return activate(payment.id, { gatewayRef, verifiedBy: null });
}

/** Admin manual approval (bKash/Nagad Send Money verified by a human). */
export async function approveManualPayment(paymentId: string, adminId: string, ip?: string | null) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("পেমেন্ট পাওয়া যায়নি");
  if (payment.method !== "MANUAL") throw new Error("এটি ম্যানুয়াল পেমেন্ট নয়");
  if (payment.status === "PAID") return payment;
  const result = await activate(payment.id, { verifiedBy: adminId });
  await audit({
    actorId: adminId,
    actorRole: "ADMIN",
    action: "PAYMENT_APPROVED",
    entityType: "Payment",
    entityId: paymentId,
    metadata: { invoiceNo: payment.invoiceNo, amountPaisa: payment.amountPaisa },
    ip,
  });
  return result;
}

export async function rejectPayment(paymentId: string, adminId: string, reason: string, ip?: string | null) {
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "FAILED", note: reason },
  });
  await prisma.paymentEvent.create({
    data: { paymentId, type: "FAILED", payload: { reason } as never },
  });
  await notify({
    userId: payment.userId,
    type: "PAYMENT",
    titleBn: "পেমেন্ট বাতিল হয়েছে",
    bodyBn: `আপনার পেমেন্ট (${payment.invoiceNo}) যাচাই করা যায়নি। ${reason}`,
    linkUrl: "/learn",
  });
  await audit({
    actorId: adminId,
    actorRole: "ADMIN",
    action: "PAYMENT_REJECTED",
    entityType: "Payment",
    entityId: paymentId,
    metadata: { reason },
    ip,
  });
  return payment;
}

export async function refundPayment(paymentId: string, adminId: string, refundPaisa: number, ip?: string | null) {
  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: "REFUNDED",
      refundedAt: new Date(),
      refundAmountPaisa: refundPaisa,
    },
  });
  // Refunded enrollments lose access immediately.
  if (payment.enrollmentId) {
    await prisma.enrollment.update({
      where: { id: payment.enrollmentId },
      data: { status: "REVOKED" },
    });
  }
  await prisma.paymentEvent.create({
    data: { paymentId, type: "REFUNDED", payload: { refundPaisa } as never },
  });
  await audit({
    actorId: adminId,
    actorRole: "ADMIN",
    action: "PAYMENT_REFUNDED",
    entityType: "Payment",
    entityId: paymentId,
    metadata: { refundPaisa },
    ip,
  });
  return payment;
}

/** Core activation: PAID + ACTIVE enrollment + notifications. Atomic. */
async function activate(
  paymentId: string,
  opts: { gatewayRef?: string | null; verifiedBy?: string | null },
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        verifiedAt: new Date(),
        verifiedBy: opts.verifiedBy,
        gatewayRef: opts.gatewayRef ?? undefined,
      },
    });

    const enrollment = await tx.enrollment.upsert({
      where: { userId_courseId: { userId: payment.userId, courseId: payment.courseId } },
      create: {
        userId: payment.userId,
        courseId: payment.courseId,
        status: "ACTIVE",
        source: "PAYMENT",
        accessExpiresAt: null,
      },
      update: { status: "ACTIVE", accessExpiresAt: null, source: "PAYMENT" },
    });
    await tx.payment.update({ where: { id: paymentId }, data: { enrollmentId: enrollment.id } });

    await tx.paymentEvent.create({
      data: {
        paymentId,
        type: "VERIFIED",
        payload: { gatewayRef: opts.gatewayRef, verifiedBy: opts.verifiedBy } as never,
      },
    });

    const course = await tx.course.findUnique({
      where: { id: payment.courseId },
      select: { titleBn: true },
    });
    await tx.notification.create({
      data: {
        userId: payment.userId,
        type: "ENROLLMENT",
        titleBn: "কোর্স এনরোলমেন্ট সফল",
        bodyBn: `অভিনন্দন! "${course?.titleBn}" কোর্সে আপনার এনরোলমেন্ট সম্পন্ন হয়েছে। এখনই শেখা শুরু করুন।`,
        linkUrl: "/learn",
      },
    });
    await tx.notification.create({
      data: {
        userId: payment.userId,
        type: "PAYMENT",
        titleBn: "পেমেন্ট নিশ্চিত হয়েছে",
        bodyBn: `${payment.invoiceNo} ইনভয়েসের পেমেন্ট গ্রহণ করা হয়েছে।`,
        linkUrl: "/learn/billing",
      },
    });
    return payment;
  });
}

/** Free course direct enrollment (no payment). */
export async function enrollFree(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course || course.status !== "PUBLISHED") throw new Error("কোর্স পাওয়া যায়নি");
  const base = course.discountPaisa ?? course.pricePaisa;
  if (base !== 0) throw new Error("এটি ফ্রি কোর্স নয়");
  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId, status: "ACTIVE", source: "FREE_ENROLLMENT" },
    update: { status: "ACTIVE", source: "FREE_ENROLLMENT" },
  });
  return enrollment;
}
