"use server";

import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/auth/rate-limit";
import { headers } from "next/headers";
import { z } from "zod";

export interface ContactState {
  error?: string;
  success?: string;
}

const schema = z.object({
  name: z.string().trim().min(2, "নাম দিন").max(80),
  email: z.string().trim().email("সঠিক ইমেইল দিন").toLowerCase(),
  phone: z
    .string()
    .trim()
    .regex(/^01[3-9]\d{8}$/, "সঠিক মোবাইল নম্বর দিন")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  subject: z.string().trim().min(3, "বিষয় লিখুন").max(120),
  message: z.string().trim().min(10, "বার্তা কমপক্ষে ১০ অক্ষর").max(2000),
});

export async function submitContactAction(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`contact:${ip}`, 5, 3600);
  if (!rl.ok) return { error: "অনেকবার বার্তা পাঠানো হয়েছে। কিছুক্ষণ পরে চেষ্টা করুন।" };

  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "ফর্ম পূরণ করুন" };

  await prisma.contactMessage.create({ data: parsed.data });
  return { success: "বার্তা পাঠানো হয়েছে। আমরা শীঘৈ উত্তর দেব।" };
}
