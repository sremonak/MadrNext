"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type FormState } from "@/lib/actions/auth";
import { Alert, Button, Field, Input, Select } from "@/components/ui";

const initial: FormState = {};

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, initial);

  return (
    <div className="w-full max-w-md">
      <div className="rule-frame rounded-lg bg-surface p-8">
        <h1 className="display text-[26px] font-bold text-ink">অ্যাকাউন্ট খুলুন</h1>
        <p className="mt-1.5 text-[14px] text-muted">
          এক মিনিটে অ্যাকাউন্ট খুলে ফ্রি প্রিভিউ পাঠ শুরু করুন।
        </p>
        <form action={action} className="mt-7 flex flex-col gap-5">
          <Field label="পুরো নাম" htmlFor="name" required>
            <Input id="name" name="name" autoComplete="name" placeholder="আপনার নাম" required />
          </Field>
          <Field label="ইমেইল" htmlFor="email" required>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          </Field>
          <Field label="মোবাইল (ঐচ্ছিক)" htmlFor="phone" hint="একাদশ অঙ্কের নম্বর, যেমন 01712345678">
            <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="01712345678" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="পরীক্ষা" htmlFor="level" required>
              <Select id="level" name="level" defaultValue="DAKHIL">
                <option value="DAKHIL">দাখিল</option>
                <option value="ALIM">আলিম</option>
              </Select>
            </Field>
            <Field label="শ্রেণি" htmlFor="classNumber" required>
              <Select id="classNumber" name="classNumber" defaultValue="9">
                <option value="9">৯ম</option>
                <option value="10">১০ম</option>
                <option value="11">১১শ</option>
                <option value="12">১২শ</option>
              </Select>
            </Field>
          </div>
          <Field
            label="পাসওয়ার্ড"
            htmlFor="password"
            hint="কমপক্ষে ৮ অক্ষর, অন্তত একটি সংখ্যা থাকতে হবে"
            required
          >
            <Input id="password" name="password" type="password" autoComplete="new-password" required />
          </Field>
          {state.error && <Alert tone="danger">{state.error}</Alert>}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "অ্যাকাউন্ট তৈরি হচ্ছে…" : "রেজিস্ট্রেশন সম্পন্ন করুন"}
          </Button>
          <p className="text-center text-[12.5px] leading-relaxed text-muted">
            রেজিস্ট্রেশন করলে আপনি আমাদের{" "}
            <Link href="/terms" className="text-teal underline">
              শর্তাবলি
            </Link>{" "}
            ও{" "}
            <Link href="/privacy" className="text-teal underline">
              প্রাইভেসি পলিসি
            </Link>
            -তে সম্মত হচ্ছেন।
          </p>
        </form>
        <p className="mt-6 text-center text-[13.5px] text-muted">
          ইতিমধ্যে অ্যাকাউন্ট আছে?{" "}
          <Link href="/login" className="font-semibold text-teal hover:text-teal-deep">
            লগইন করুন
          </Link>
        </p>
      </div>
    </div>
  );
}
