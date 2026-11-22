"use client";

import { useState, useTransition } from "react";
import { Check, X, RotateCcw } from "lucide-react";
import { approvePaymentAction, rejectPaymentAction, refundPaymentAction } from "@/lib/actions/admin";

export function PaymentRowActions({
  paymentId,
  canRefund,
  refundPaisa,
}: {
  paymentId: string;
  canRefund: boolean;
  refundPaisa?: number;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  if (canRefund) {
    return (
      <button
        onClick={() =>
          start(async () => {
            const err = await refundPaymentAction(paymentId, refundPaisa ?? 0);
            setMsg(err ?? "রিফান্ড সম্পন্ন");
            if (!err) window.location.reload();
          })
        }
        disabled={pending}
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-warn hover:underline"
        title="রিফান্ড"
      >
        <RotateCcw size={13} /> রিফান্ড
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() =>
          start(async () => {
            const err = await approvePaymentAction(paymentId);
            setMsg(err ?? "অনুমোদিত");
            if (!err) window.location.reload();
          })
        }
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-xs bg-success px-2 py-1 text-[12px] font-semibold text-white disabled:opacity-50"
        title="অনুমোদন"
      >
        <Check size={12} /> অনুমোদন
      </button>
      <button
        onClick={() => {
          const reason = window.prompt("বাতিল করার কারণ লিখুন:");
          if (!reason) return;
          start(async () => {
            const err = await rejectPaymentAction(paymentId, reason);
            setMsg(err ?? "বাতিল হয়েছে");
            if (!err) window.location.reload();
          });
        }}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-xs border border-danger px-2 py-1 text-[12px] font-semibold text-danger disabled:opacity-50"
        title="বাতিল"
      >
        <X size={12} /> বাতিল
      </button>
      {msg && <span className="text-[11.5px] text-muted">{msg}</span>}
    </div>
  );
}
