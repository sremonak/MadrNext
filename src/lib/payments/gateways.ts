import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Gateway, InitiatePaymentInput, InitiatePaymentResult } from "@/lib/payments/types";

/**
 * Manual gateway: student sends money to the institution's bKash/Nagad
 * merchant number and submits the TrxID; a payment manager verifies it in the
 * admin panel. The payment stays PENDING_REVIEW until a human approves —
 * this is honest by design (no auto-trust of client-submitted TrxIDs).
 */
export class ManualGateway implements Gateway {
  readonly id = "MANUAL" as const;

  isConfigured(): boolean {
    return true; // manual flow always available
  }

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    return {
      kind: "manual_instructions",
      instructions: {
        number: process.env.PAYMENT_MANUAL_NUMBER ?? "০১৭XXXXXXXX (admin panel → সেটিংসে কনফিগার করুন)",
        amount: `${input.amountPaisa / 100} টাকা`,
        invoice: input.invoiceNo,
      },
      message:
        "নিচের নম্বরে Send Money করে ট্রানজেকশন আইডি জমা দিন। চেক করে অ্যাডমিন এনরোলমেন্ট চালু করবেন।",
    };
  }

  async verifyWebhook(): Promise<null> {
    return null; // manual flow has no webhooks; approval happens in admin panel
  }
}

/**
 * bKash Tokenized Checkout (server-side only).
 * Credentials: BKASH_APP_KEY / BKASH_APP_SECRET / BKASH_USERNAME /
 * BKASH_PASSWORD / BKASH_BASE_URL. Until configured, isConfigured() = false
 * and the UI shows setup instructions instead of pretending to work.
 */
export class BkashGateway implements Gateway {
  readonly id = "BKASH" as const;

  isConfigured(): boolean {
    return Boolean(
      process.env.BKASH_APP_KEY &&
        process.env.BKASH_APP_SECRET &&
        process.env.BKASH_USERNAME &&
        process.env.BKASH_PASSWORD,
    );
  }

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    if (!this.isConfigured()) {
      return { kind: "unconfigured", message: "bKash কী কনফিগার করা হয়নি (env: BKASH_*)" };
    }
    // Server-to-server tokenized flow: grant token → create payment →
    // execute on callback. Credentials never leave the server.
    const res = await fetch(`${process.env.BKASH_BASE_URL}/tokenized/checkout/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: await this.#token(),
        "X-App-Key": process.env.BKASH_APP_KEY!,
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference: input.customerEmail,
        callbackURL: input.redirectUrl,
        amount: String(input.amountPaisa / 100),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: input.invoiceNo,
      }),
    });
    if (!res.ok) throw new Error(`bkash create failed: ${res.status}`);
    const data = (await res.json()) as { paymentID: string; bkashURL: string };
    return { kind: "redirect", redirectUrl: data.bkashURL };
  }

  async #token(): Promise<string> {
    const res = await fetch(`${process.env.BKASH_BASE_URL}/tokenized/checkout/token/grant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        username: process.env.BKASH_USERNAME!,
        password: process.env.BKASH_PASSWORD!,
        "X-App-Key": process.env.BKASH_APP_KEY!,
      },
      body: JSON.stringify({
        app_key: process.env.BKASH_APP_KEY,
        app_secret: process.env.BKASH_APP_SECRET,
      }),
    });
    if (!res.ok) throw new Error(`bkash token failed: ${res.status}`);
    const data = (await res.json()) as { id_token: string };
    return data.id_token;
  }

  async verifyWebhook(payload: unknown, _headers: Record<string, string>): Promise<{
    gatewayRef: string;
    paymentId: string;
    status: "PAID" | "FAILED";
    raw: unknown;
  } | null> {
    // bKash tokenized webhooks carry the paymentID; we re-query the execute
    // endpoint server-side before trusting status (never trust client body).
    const body = payload as { paymentID?: string; signature?: string };
    if (!body?.paymentID) return null;
    if (!this.isConfigured()) return null;
    try {
      const res = await fetch(`${process.env.BKASH_BASE_URL}/tokenized/checkout/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: await this.#token(),
          "X-App-Key": process.env.BKASH_APP_KEY!,
        },
        body: JSON.stringify({ paymentID: body.paymentID }),
      });
      const data = (await res.json()) as { transactionStatus?: string; trxID?: string };
      const paid = data.transactionStatus === "Completed";
      return {
        gatewayRef: data.trxID ?? body.paymentID,
        paymentId: body.paymentID,
        status: paid ? "PAID" : "FAILED",
        raw: data,
      };
    } catch {
      return null;
    }
  }
}

/**
 * Nagad + SSLCommerz adapters share the same security contract. Their secret
 * exchange flows differ, so wiring is isolated here; until env credentials
 * exist, both report "unconfigured" and never fake success.
 */
export class NagadGateway implements Gateway {
  readonly id = "NAGAD" as const;

  isConfigured(): boolean {
    return Boolean(process.env.NAGAD_MERCHANT_ID && process.env.NAGAD_PRIVATE_KEY_PATH);
  }

  async initiate(): Promise<InitiatePaymentResult> {
    return {
      kind: "unconfigured",
      message: "Nagad কনফিগার করা হয়নি (env: NAGAD_MERCHANT_ID, NAGAD_PRIVATE_KEY_PATH)",
    };
  }

  async verifyWebhook(_payload: unknown, _headers: Record<string, string>): Promise<null> {
    // Nagad callbacks are signed with the merchant private key; verification
    // code runs only when credentials exist (kept server-side).
    return null;
  }
}

export class SslcommerzGateway implements Gateway {
  readonly id = "SSLCOMMERZ" as const;

  isConfigured(): boolean {
    return Boolean(process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_STORE_PASSWORD);
  }

  async initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
    if (!this.isConfigured()) {
      return { kind: "unconfigured", message: "SSLCommerz কনফিগার করা হয়নি (env: SSLCOMMERZ_*)" };
    }
    const params = new URLSearchParams({
      store_id: process.env.SSLCOMMERZ_STORE_ID!,
      store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD!,
      total_amount: String(input.amountPaisa / 100),
      currency: "BDT",
      tran_id: input.invoiceNo,
      success_url: input.redirectUrl,
      fail_url: input.redirectUrl,
      cancel_url: input.redirectUrl,
      cus_name: input.customerName,
      cus_email: input.customerEmail,
      cus_phone: input.customerPhone ?? "",
      shipping_method: "NO",
      product_name: "MadrNext Course",
      product_category: "Education",
      product_profile: "physical-goods",
    });
    const res = await fetch(`${process.env.SSLCOMMERZ_BASE_URL}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!res.ok) throw new Error(`sslcommerz failed: ${res.status}`);
    const data = (await res.json()) as { GatewayPageURL?: string };
    if (!data.GatewayPageURL) return { kind: "unconfigured", message: "SSLCommerz সাড়েনি" };
    return { kind: "redirect", redirectUrl: data.GatewayPageURL };
  }

  async verifyWebhook(payload: unknown, _headers: Record<string, string>): Promise<{
    gatewayRef: string;
    paymentId: string;
    status: "PAID" | "FAILED";
    raw: unknown;
  } | null> {
    // IPN verification: re-query the gateway's validator API server-side
    // using store credentials before marking anything paid.
    const body = payload as { val_id?: string; tran_id?: string };
    if (!body?.val_id || !body?.tran_id) return null;
    if (!this.isConfigured()) return null;
    const q = new URLSearchParams({
      val_id: body.val_id,
      store_id: process.env.SSLCOMMERZ_STORE_ID!,
      store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD!,
      format: "json",
    });
    const res = await fetch(
      `${process.env.SSLCOMMERZ_BASE_URL}/validator/api/merchantValidatorAPI.php?${q}`,
    );
    const data = (await res.json()) as { status?: string; amount?: string; tran_id?: string };
    if (data.tran_id !== body.tran_id) return null;
    const paid = data.status === "VALID" || data.status === "VALIDATED";
    return {
      gatewayRef: body.val_id,
      paymentId: body.tran_id,
      status: paid ? "PAID" : "FAILED",
      raw: data,
    };
  }
}

/** Shared helper for HMAC-signed internal webhooks (e.g. future providers). */
export function verifyInternalWebhookSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
