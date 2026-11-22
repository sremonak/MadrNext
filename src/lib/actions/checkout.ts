"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { createPayment, enrollFree } from "@/lib/payments/service";
import { ManualGateway, BkashGateway, NagadGateway, SslcommerzGateway } from "@/lib/payments/gateways";
import { rateLimit } from "@/lib/auth/rate-limit";
import { audit } from "@/lib/audit";
import { z } from "zod";

export interface CheckoutState {
  error?: string;
  success?: string;
  /** gateway redirect URL */
  redirectUrl?: string;
  /** manual payment instructions */
  manual?: { number: string; amount: string; invoice: string; message: string };
}

const schema = z.object({
  courseId: z.string().min(10),
  method: z.enum(["BKASH", "NAGAD", "SSLCOMMERZ", "MANUAL"]),
  couponCode: z.string().trim().max(24).optional(),
  senderNumber: z
    .string()
    .trim()
    .regex(/^01[3-9]\d{8}$/, "সঠিক মোবাইল নম্বর দিন (যেমন 01712345678)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  manualTxnId: z.string().trim().min(6, "ট্রানজেকশন আইডি কমপক্ষে ৬ অক্ষর").max(40).optional(),
});

export async function startCheckoutAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`checkout:${ctx.user.id}`, 10, 3600);
  if (!rl.ok) return { error: "অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পরে চেষ্টা করুন।" };

  const parsed = schema.safeParse({
    courseId: formData.get("courseId"),
    method: formData.get("method"),
    couponCode: formData.get("couponCode") || undefined,
    senderNumber: formData.get("senderNumber") || undefined,
    manualTxnId: formData.get("manualTxnId") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ফর্ম যাচাই ব্যর্থ" };
  const { courseId, method, couponCode, senderNumber, manualTxnId } = parsed.data;

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { slug: true, titleBn: true } });
  if (!course) return { error: "কোর্স পাওয়া যায়নি" };

  try {
    const payment = await createPayment({
      userId: ctx.user.id,
      courseId,
      method,
      couponCode,
      senderNumber,
      manualTxnId,
    });

    if (method === "MANUAL") {
      if (!manualTxnId) return { error: "ট্রানজেকশন আইডি দিন" };
      const g = new ManualGateway();
      const init = await g.initiate({
        paymentId: payment.id,
        invoiceNo: payment.invoiceNo,
        amountPaisa: payment.amountPaisa,
        customerName: ctx.user.name,
        customerEmail: ctx.user.email ?? "",
        redirectUrl: "",
        webhookUrl: "",
      });
      await audit({
        actorId: ctx.user.id,
        action: "MANUAL_PAYMENT_SUBMITTED",
        entityType: "Payment",
        entityId: payment.id,
        metadata: { invoiceNo: payment.invoiceNo, txnId: manualTxnId },
        ip,
      });
      return {
        success: "ট্রানজেকশন জমা হয়েছে। যাচাই করে অ্যাডমিন এনরোলমেন্ট চালু করবেন — নোটিফিকেশন পাবেন।",
        manual: {
          number: init.instructions?.number ?? "",
          amount: init.instructions?.amount ?? "",
          invoice: payment.invoiceNo,
          message: init.message ?? "",
        },
      };
    }

    const gateway =
      method === "BKASH" ? new BkashGateway() : method === "NAGAD" ? new NagadGateway() : new SslcommerzGateway();

    if (!gateway.isConfigured()) {
      const init = await gateway.initiate({
        paymentId: payment.id,
        invoiceNo: payment.invoiceNo,
        amountPaisa: payment.amountPaisa,
        customerName: ctx.user.name,
        customerEmail: ctx.user.email ?? "",
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/learn/billing`,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payments/${gateway.id.toLowerCase()}`,
      });
      return {
        error:
          init.message ??
          "এই গেটওয়ে এখনো কনফিগার করা হয়নি। ম্যানুয়াল পেমেন্ট (বিকাশ/নগদ) অথবা SSLCommerz ব্যবহার করুন।",
      };
    }

    const init = await gateway.initiate({
      paymentId: payment.id,
      invoiceNo: payment.invoiceNo,
      amountPaisa: payment.amountPaisa,
      customerName: ctx.user.name,
      customerEmail: ctx.user.email ?? "",
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/learn/billing`,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/payments/${gateway.id.toLowerCase()}`,
    });
    if (init.kind === "redirect" && init.redirectUrl) {
      return { redirectUrl: init.redirectUrl };
    }
    return { error: init.message ?? "পেমেন্ট শুরু করা যায়নি" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "পেমেন্ট শুরু করা যায়নি" };
  }
}

export async function enrollFreeAction(courseId: string, slug: string): Promise<void> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { slug: true } });
  if (!course || course.slug !== slug) redirect("/courses");
  await enrollFree(ctx.user.id, courseId);
  await audit({
    actorId: ctx.user.id,
    action: "FREE_ENROLLMENT",
    entityType: "Course",
    entityId: courseId,
  });
  redirect(`/learn/courses/${slug}`);
}
