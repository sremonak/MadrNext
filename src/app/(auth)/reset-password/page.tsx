"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPasswordAction, type FormState } from "@/lib/actions/auth";
import { Alert, Button, Field, Input } from "@/components/ui";

const initial: FormState = {};

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, action, pending] = useActionState(resetPasswordAction, initial);

  if (!token && !state.success) {
    return (
      <Alert tone="warn">
        রিসেট টোকেন পাওয়া যায়নি।{" "}
        <Link href="/forgot-password" className="font-semibold text-teal">
          নতুন লিংক নিন
        </Link>
      </Alert>
    );
  }

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Alert tone="success">{state.success}</Alert>
        <Link
          href="/login"
          className="inline-flex h-11 items-center rounded-md bg-teal px-6 text-[15px] font-medium text-white"
        >
          লগইন করুন
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-7 flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <Field label="নতুন পাসওয়ার্ড" htmlFor="password" hint="কমপক্ষে ৮ অক্ষর, অন্তত একটি সংখ্যা" required>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="পাসওয়ার্ড আবার দিন" htmlFor="confirm" required>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "পরিবর্তন হচ্ছে…" : "পাসওয়ার্ড পরিবর্তন করুন"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="rule-frame rounded-lg bg-surface p-8">
        <h1 className="display text-[26px] font-bold text-ink">নতুন পাসওয়ার্ড সেট করুন</h1>
        <p className="mt-1.5 text-[14px] text-muted">
          পরিবর্তনের পর সব ডিভাইস থেকে স্বয়ংক্রিয়ভাবে লগআউট হবে।
        </p>
        <Suspense fallback={<div className="mt-7 skeleton h-40" />}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
