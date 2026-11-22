"use client";

import { useState, useTransition } from "react";
import { LogOut, Monitor, Smartphone, Tablet } from "lucide-react";
import { Badge } from "@/components/ui";
import { relativeTimeBn, formatDateBn } from "@/lib/format";
import { revokeOwnSessionAction } from "@/lib/actions/settings";

interface SessionView {
  id: string;
  label: string;
  deviceType: string;
  ip: string | null;
  createdAt: string;
  lastActiveAt: string;
  current: boolean;
}

const ICONS = { MOBILE: Smartphone, TABLET: Tablet, DESKTOP: Monitor, OTHER: Monitor } as const;

export function DeviceList({ sessions }: { sessions: SessionView[] }) {
  const [pending, start] = useTransition();
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  if (sessions.filter((s) => !removed.has(s.id)).length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line-strong p-5 text-[13.5px] text-muted">
        কোনো সক্রিয় সেশন নেই।
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sessions
        .filter((s) => !removed.has(s.id))
        .map((s) => {
          const Icon = ICONS[(s.deviceType as keyof typeof ICONS) ?? "OTHER"] ?? Monitor;
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10 text-teal">
                <Icon size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[14.5px] font-semibold text-ink">
                  {s.label}
                  {s.current && <Badge tone="success">এই ডিভাইস</Badge>}
                </p>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  আইপি: <span className="tabnum">{s.ip ?? "—"}</span> · প্রথম লগইন: {formatDateBn(s.createdAt)} · সর্বশেষ সক্রিয়:{" "}
                  {relativeTimeBn(s.lastActiveAt)}
                </p>
              </div>
              {!s.current && (
                <button
                  onClick={() =>
                    start(async () => {
                      await revokeOwnSessionAction(s.id);
                      setRemoved((r) => new Set(r).add(s.id));
                    })
                  }
                  disabled={pending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-danger px-3 text-[13px] font-medium text-danger transition-colors hover:bg-danger-wash disabled:opacity-50"
                >
                  <LogOut size={13} /> লগআউট
                </button>
              )}
            </div>
          );
        })}
    </div>
  );
}
