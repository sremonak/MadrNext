import type { Metadata, Viewport } from "next";
import "./globals.css";
import { hindSiliguri, notoSerifBengali } from "@/lib/fonts";
import { themeInitScript } from "@/components/theme";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "MadrNext — মাদরাসা শিক্ষার ভবিষ্যৎ",
    template: "%s | MadrNext",
  },
  description:
    "দাখিল ও আলিম শিক্ষার্থীদের জন্য আধুনিক, নিরাপদ ও পূর্ণাঙ্গ অনলাইন লার্নিং প্ল্যাটফর্ম। কোর্স, পরীক্ষা, নোট ও প্রশ্নব্যাংক — সবকিছু এক জায়গায়।",
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1a19" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${hindSiliguri.variable} ${notoSerifBengali.variable}`}>
        {children}
      </body>
    </html>
  );
}
