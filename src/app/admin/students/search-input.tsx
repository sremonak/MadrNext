"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui";

export function SearchInput({ defaultValue }: { defaultValue: string }) {
  const [q, setQ] = useState(defaultValue);
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/admin/students${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      }}
      className="relative w-full max-w-xs"
    >
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="নাম, ইমেইল বা মোবাইল দিয়ে খুঁজুন"
        className="pl-9"
        aria-label="শিক্ষার্থী খুঁজুন"
      />
    </form>
  );
}
