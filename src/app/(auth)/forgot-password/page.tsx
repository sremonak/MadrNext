"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordResetAction, type FormState } from "@/lib/actions/auth";
import { Alert, Button, Field, Input } from "@/components/ui";

const initial: FormState = {};

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initial);

  return (
    <div className="w-full max-w-md">
      <div className="rule-frame rounded-lg bg-surface p-8">
        <h1 className="display text-[26px] font-bold text-ink">পাসওয়ার্ড রিসেট</h1>
        <p className="mt-1.5 text-[14px] text-muted">
          আপনার অ্যাকাউন্টের ইমেইল দিন — রিসেটের নির্দেশনা পাঠানো হবে।
        </p>
        <form action={action} className="mt-7 flex flex-col gap-5">
          <Field label="ইমেইল" htmlFor="email" required>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          </Field>
          {state.error && <Alert tone="danger">{state.error}</Alert>}
          {state.success && <Alert tone="success">{state.success}</Alert>}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "পাঠানো হচ্ছে…" : "রিসেট লিংক পাঠান"}
          </Button>
        </form>
        <p className="mt-6 text-center text-[13.5px] text-muted">
          মনে পড়ে গেছে?{" "}
          <Link href="/login" className="font-semibold text-teal hover:text-teal-deep">
            লগইন করুন
          </Link>
        </p>
      </div>
    </div>
  );
}
