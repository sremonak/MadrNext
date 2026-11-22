"use client";

import { useTransition } from "react";
import { Ban, LogOut } from "lucide-react";
import { revokeSessionAdminAction, revokeAllUserSessionsAction } from "@/lib/actions/admin";

export function SessionRowActions({ sessionId, userId }: { sessionId: string; userId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => start(async () => { await revokeSessionAdminAction(sessionId); })}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-xs border border-warn px-2 py-1 text-[12px] font-medium text-warn hover:bg-warn-wash disabled:opacity-50"
        title="সেশন বাতিল"
      >
        <Ban size={11} /> বাতিল
      </button>
      <button
        onClick={() =>
          start(async () => {
            if (window.confirm("এই ব্যবহারকারীর সব সেশন বাতিল করবেন?")) {
              await revokeAllUserSessionsAction(userId);
            }
          })
        }
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-xs border border-danger px-2 py-1 text-[12px] font-medium text-danger hover:bg-danger-wash disabled:opacity-50"
        title="ফোর্স লগআউট (সব সেশন)"
      >
        <LogOut size={11} /> ফোর্স লগআউট
      </button>
    </div>
  );
}
