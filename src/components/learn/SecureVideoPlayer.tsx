"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

/**
 * Secure video player.
 * - Playback token is fetched from the backend per lesson (short TTL).
 * - HLS manifest/segments are served by authorized API routes only.
 * - Dynamic watermark: student identity + playback session, position drifts.
 * - Heartbeats keep the playback session alive + store resume position.
 * - Concurrent playback is enforced server-side; player surfaces the error.
 *
 * NOTE (honesty): the watermark discourages re-sharing; no browser JS can
 * fully prevent screen recording. Server-side authorization is the real gate.
 */

interface PlaybackGrant {
  token: string;
  manifestUrl: string;
  playbackSessionId: string;
  watermark: string;
  durationSeconds: number;
  resumeAt: number;
}

export function SecureVideoPlayer({ lessonId }: { lessonId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [grant, setGrant] = useState<PlaybackGrant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let hls: import("hls.js").default | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    async function start(resume: boolean) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/media/playback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId, action: resume ? "resume" : "start" }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
          setError(data.message ?? "ভিডিও চালু করা যায়নি। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।");
          return;
        }
        const data = (await res.json()) as PlaybackGrant;
        if (cancelled) return;
        setGrant(data);

        const video = videoRef.current!;
        const src = `${data.manifestUrl}?t=${encodeURIComponent(data.token)}`;

        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = src; // Safari native HLS
        } else {
          const mod = await import("hls.js");
          if (cancelled) return;
          if (!mod.default.isSupported()) {
            setError("এই ব্রাউজারে ভিডিও সাপোর্ট নেই। আধুনিক ব্রাউজার ব্যবহার করুন।");
            return;
          }
          hls = new mod.default({ xhrSetup: undefined });
          hls.loadSource(src);
          hls.attachMedia(video);
        }
        video.addEventListener("loadedmetadata", () => {
          if (data.resumeAt > 5 && video.duration > data.resumeAt) {
            video.currentTime = data.resumeAt;
          }
        });

        // heartbeat every 15s (keeps session alive + saves position)
        heartbeatTimer = setInterval(() => {
          if (video.paused && video.currentTime === 0) return;
          fetch("/api/media/heartbeat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify({
              playbackSessionId: data.playbackSessionId,
              lessonId,
              positionSeconds: Math.floor(video.currentTime),
            }),
          }).catch(() => undefined);
        }, 15_000);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    start(true);

    return () => {
      cancelled = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (hls) hls.destroy();
      // end playback session promptly
      fetch("/api/media/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          playbackSessionId: grant?.playbackSessionId ?? "",
          lessonId,
          positionSeconds: 0,
          completed: false,
        }),
      }).catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  // Watermark drift: every 12s move to a new corner-ish position.
  const [wmPos, setWmPos] = useState({ x: 4, y: 6 });
  useEffect(() => {
    if (!grant) return;
    const id = setInterval(() => {
      const corners = [
        { x: 4, y: 6 }, { x: 60, y: 6 }, { x: 4, y: 84 }, { x: 60, y: 84 },
        { x: 30, y: 45 },
      ];
      setWmPos(corners[Math.floor(Math.random() * corners.length)]);
    }, 12_000);
    return () => clearInterval(id);
  }, [grant]);

  return (
    <div className="relative overflow-hidden rounded-md bg-ink" style={{ aspectRatio: "16/9" }}>
      <video
        ref={videoRef}
        controls
        playsInline
        controlsList="nodownload"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        className="h-full w-full"
        aria-label="কোর্স ভিডিও"
      />
      {grant && (
        <div className="watermark-drift" aria-hidden="true">
          <span style={{ ["--wm-x" as never]: `${wmPos.x}%`, ["--wm-y" as never]: `${wmPos.y}%` }}>
            {grant.watermark}
          </span>
        </div>
      )}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/80">
          <Loader2 className="animate-spin text-paper" size={28} />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/90 px-6 text-center">
          <AlertTriangle size={28} className="text-gold-soft" />
          <p className="max-w-sm text-[14px] leading-relaxed text-paper">{error}</p>
        </div>
      )}
    </div>
  );
}
