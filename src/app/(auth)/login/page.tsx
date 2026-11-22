"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type FormState } from "@/lib/actions/auth";
import { Alert, Button, Field, Input } from "@/components/ui";

const initial: FormState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <div className="w-full max-w-md">
      <div className="rule-frame rounded-lg bg-surface p-8">
        <h1 className="display text-[26px] font-bold text-ink">লগইন করুন</h1>
        <p className="mt-1.5 text-[14px] text-muted">
          ইমেইল বা মোবাইল নম্বর দিয়ে আপনার অ্যাকাউন্টে ঢুকুন।
        </p>
        <form action={action} className="mt-7 flex flex-col gap-5">
          <Field label="ইমেইল বা মোবাইল" htmlFor="identifier" required>
            <Input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              placeholder="you@example.com অথবা 01712345678"
              required
            />
          </Field>
          <Field label="পাসওয়ার্ড" htmlFor="password" required>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          {state.error && <Alert tone="danger">{state.error}</Alert>}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "যাচাই করা হচ্ছে…" : "লগইন"}
          </Button>
        </form>
        <div className="mt-6 flex items-center justify-between text-[13.5px]">
          <Link href="/forgot-password" className="text-muted hover:text-teal">
            পাসওয়ার্ড ভুলে গেছেন?
          </Link>
          <Link href="/register" className="font-semibold text-teal hover:text-teal-deep">
            অ্যাকাউন্ট নেই? খুলুন →
          </Link>
        </div>
      </div>
    </div>
  );
}
