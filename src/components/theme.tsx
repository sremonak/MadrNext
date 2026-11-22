"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const THEME_KEY = "madrnext-theme";

/** Inline script in <head> sets the class before paint — no flash. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setDark(document.documentElement.classList.contains("dark"));
      setReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // private mode — theme stays for the session
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "লাইট মোড চালু করুন" : "ডার্ক মোড চালু করুন"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted transition-colors hover:border-teal hover:text-teal"
      suppressHydrationWarning
    >
      {ready ? dark ? <Sun size={16} /> : <Moon size={16} /> : <span className="h-4 w-4" />}
    </button>
  );
}
