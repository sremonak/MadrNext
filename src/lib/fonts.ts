import localFont from "next/font/local";

/** UI + body: Hind Siliguri (Bengali-first sans, covers Latin). */
export const hindSiliguri = localFont({
  src: [
    { path: "../fonts/HindSiliguri-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/HindSiliguri-Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/HindSiliguri-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../fonts/HindSiliguri-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-hind-siliguri",
  display: "swap",
});

/** Display/headings: Noto Serif Bengali (variable weight) — scholarly voice. */
export const notoSerifBengali = localFont({
  src: [{ path: "../fonts/NotoSerifBengali-var.ttf", weight: "400 900", style: "normal" }],
  variable: "--font-noto-serif-bengali",
  display: "swap",
});
