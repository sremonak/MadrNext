"use client";

import { useTransition } from "react";
import { Check, MailCheck } from "lucide-react";
import { saveContactStatusAction } from "@/lib/actions/admin";

export function ContactRowActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  if (status === "REPLIED") return null;
  return (
    <div className="flex gap-2">
      {status === "NEW" && (
        <button
          onClick={() => start(async () => { await saveContactStatusAction(id, "READ"); })}
          disabled={pending}
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted hover:text-teal"
        >
          <MailCheck size={13} /> পঠিত করুন
        </button>
      )}
      <button
        onClick={() => start(async () => { await saveContactStatusAction(id, "REPLIED"); })}
        disabled={pending}
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-teal hover:text-teal-deep"
      >
        <Check size={13} /> উত্তর দেওয়া হয়েছে
      </button>
    </div>
  );
}
