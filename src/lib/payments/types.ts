import "server-only";

/**
 * Payment gateway abstraction.
 *
 * SECURITY CONTRACT (all providers must follow):
 *  - The browser never sees gateway secrets; all secret calls are server-side.
 *  - A payment is marked PAID only after server-side verification
 *    (gateway query API or a signature-verified webhook). Browser redirects
 *    and client-side callbacks are NEVER sufficient on their own.
 *  - Webhooks must verify signatures before trusting payloads.
 *
 * Implementations included:
 *  - ManualGateway    (bKash/Nagad "Send Money" manual verification flow)
 *  - BkashGateway     (Tokenized checkout; sandbox wiring documented)
 *  - NagadGateway     (interface present; credentials via env)
 *  - SslcommerzGateway (interface present; credentials via env)
 *
 * Without configured credentials, gateways run in "unconfigured" mode and the
 * UI clearly tells the student/admin that live keys are required.
 */

export interface InitiatePaymentInput {
  paymentId: string;
  invoiceNo: string;
  amountPaisa: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  redirectUrl: string;
  webhookUrl: string;
}

export interface InitiatePaymentResult {
  kind: "redirect" | "manual_instructions" | "unconfigured";
  redirectUrl?: string;
  instructions?: Record<string, string>;
  message?: string;
}

export interface Gateway {
  readonly id: "BKASH" | "NAGAD" | "SSLCOMMERZ" | "MANUAL";
  isConfigured(): boolean;
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  /** Verify a webhook or callback; return null if the payload is invalid. */
  verifyWebhook(payload: unknown, headers: Record<string, string>): Promise<{
    gatewayRef: string;
    paymentId: string;
    status: "PAID" | "FAILED";
    raw: unknown;
  } | null>;
}

export function formatBDT(paisa: number): string {
  const taka = paisa / 100;
  return new Intl.NumberFormat("bn-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: taka % 1 === 0 ? 0 : 2,
  }).format(taka);
}
