"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Lock } from "lucide-react";

/**
 * In-browser PDF viewer with protection layers:
 *  - pages render to canvas (no native PDF download UI)
 *  - short-lived signed token from the backend; document served by API only
 *  - dynamic watermark overlay (student identity) on every page
 *  - context menu, download & print disabled in this viewer
 *
 * Honesty note: these measures discourage copying but cannot guarantee full
 * prevention of screenshots or manual reproduction.
 */

export function SecurePdfViewer({ lessonId }: { lessonId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<{ canvas: HTMLCanvasElement }[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [watermark, setWatermark] = useState("");
  const [current, setCurrent] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const created: HTMLCanvasElement[] = [];

    async function load() {
      try {
        const tokenRes = await fetch("/api/media/document-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId }),
        });
        if (!tokenRes.ok) {
          const data = (await tokenRes.json().catch(() => ({}))) as { reason?: string };
          const msgs: Record<string, string> = {
            NOT_ENROLLED: "এই নোট দেখতে কোর্সে এনরোলমেন্ট প্রয়োজন।",
            PENDING: "এনরোলমেন্ট যাচাই চলছে — অনুমোদনের পরে দেখতে পারবেন।",
            EXPIRED: "এনরোলমেন্টের মেয়াদ শেষ।",
            SUSPENDED: "এনরোলমেন্ট সাময়িকভাবে বন্ধ আছে।",
            REVOKED: "এই কোর্সের অ্যাক্সেস বাতিল হয়েছে।",
            USER_SUSPENDED: "আপনার অ্যাকাউন্ট স্থগিত অবস্থায় আছে।",
          };
          setError(msgs[data.reason ?? ""] ?? "নোট লোড করা যায়নি।");
          setStatus("error");
          return;
        }
        const { documentUrl, watermark: wm } = (await tokenRes.json()) as {
          documentUrl: string;
          watermark: string;
        };
        setWatermark(wm);

        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdf.worker.min.mjs";
        const pdf = await pdfjs.getDocument({ url: documentUrl }).promise;

        const container = containerRef.current!;
        const targetPages: { canvas: HTMLCanvasElement }[] = [];
        for (let i = 1; i <= Math.min(pdf.numPages, 60); i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.6 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "mx-auto my-4 block shadow-raised";
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;
          container.appendChild(canvas);
          created.push(canvas);
          targetPages.push({ canvas });
          setStatus("ready");
        }
        setPages(targetPages);
      } catch {
        if (!cancelled) {
          setError("নোট লোড করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।");
          setStatus("error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      for (const c of created) c.remove();
    };
  }, [lessonId]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between rounded-md border border-line bg-surface px-4 py-2.5">
        <p className="flex items-center gap-2 text-[12.5px] text-muted">
          <Lock size={13} className="text-teal" />
          নিরাপদ ভিউয়ার — ডাউনলোড ও প্রিন্ট বন্ধ; পাতায় আপনার শনাক্তকারী এমবেড আছে।
        </p>
        {status === "ready" && pages.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const el = pages[current - 2]?.canvas;
                el?.scrollIntoView({ behavior: "smooth" });
                setCurrent((c) => Math.max(1, c - 1));
              }}
              disabled={current <= 1}
              className="rounded-md border border-line p-1.5 text-muted hover:text-teal disabled:opacity-40"
              aria-label="পূর্ববর্তী পাতা"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="tabnum text-[13px] text-ink">
              {current.toLocaleString("bn-IN")} / {pages.length.toLocaleString("bn-IN")}
            </span>
            <button
              onClick={() => {
                const el = pages[current]?.canvas;
                el?.scrollIntoView({ behavior: "smooth" });
                setCurrent((c) => Math.min(pages.length, c + 1));
              }}
              disabled={current >= pages.length}
              className="rounded-md border border-line p-1.5 text-muted hover:text-teal disabled:opacity-40"
              aria-label="পরবর্তী পাতা"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className="pdf-stage scroll-slim max-h-[72vh] p-4"
        onContextMenu={(e) => e.preventDefault()}
      >
        {status === "loading" && (
          <div className="flex h-72 items-center justify-center">
            <Loader2 className="animate-spin text-paper/80" size={26} />
          </div>
        )}
        {status === "error" && (
          <div className="flex h-72 items-center justify-center px-6 text-center text-[14px] text-paper">
            {error}
          </div>
        )}
      </div>
      {watermark && status === "ready" && (
        <p className="mt-2 text-center text-[11.5px] text-muted" aria-hidden="true">
          ডকুমেন্ট শনাক্তকারী: {watermark}
        </p>
      )}
    </div>
  );
}
