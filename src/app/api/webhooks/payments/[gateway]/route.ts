import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { markPaymentVerifiedByGateway } from "@/lib/payments/service";
import { BkashGateway, NagadGateway, SslcommerzGateway } from "@/lib/payments/gateways";
import { audit } from "@/lib/audit";

/**
 * Payment webhooks — the ONLY path a gateway payment becomes PAID.
 * Signature/payload validation happens before any state change; invalid
 * payloads are logged (PaymentEvent) and rejected with 400/401.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ gateway: string }> },
) {
  const { gateway } = await params;
  const rawBody = await req.text();

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k] = v));

  const gw =
    gateway === "bkash"
      ? new BkashGateway()
      : gateway === "nagad"
        ? new NagadGateway()
        : gateway === "sslcommerz"
          ? new SslcommerzGateway()
          : null;

  if (!gw) return NextResponse.json({ error: "unknown gateway" }, { status: 404 });

  const verified = await gw.verifyWebhook(payload, headers);
  if (!verified) {
    // Log the rejected attempt against the referenced payment when possible.
    const ref = (payload as { paymentID?: string; tran_id?: string }).paymentID ??
      (payload as { tran_id?: string }).tran_id ?? null;
    if (ref) {
      const payment = await prisma.payment.findFirst({
        where: { OR: [{ invoiceNo: ref }, { gatewayRef: ref }] },
        select: { id: true },
      });
      if (payment) {
        await prisma.paymentEvent.create({
          data: { paymentId: payment.id, type: "WEBHOOK_REJECTED", signatureValid: false, payload: payload as never },
        });
      }
    }
    return NextResponse.json({ error: "verification failed" }, { status: 401 });
  }

  // Find our payment by invoice/ref and finalize
  const payment = await prisma.payment.findFirst({
    where: { OR: [{ invoiceNo: verified.paymentId }, { gatewayRef: verified.gatewayRef }] },
  });
  if (!payment) return NextResponse.json({ error: "payment not found" }, { status: 404 });

  await prisma.paymentEvent.create({
    data: { paymentId: payment.id, type: "WEBHOOK_RECEIVED", signatureValid: true, payload: payload as never },
  });

  if (verified.status === "PAID") {
    await markPaymentVerifiedByGateway(payment.id, verified.gatewayRef);
    await audit({
      action: "GATEWAY_PAYMENT_VERIFIED",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { gateway: gw.id, gatewayRef: verified.gatewayRef },
    });
    return NextResponse.json({ ok: true, status: "PAID" });
  }

  await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
  return NextResponse.json({ ok: true, status: "FAILED" });
}
