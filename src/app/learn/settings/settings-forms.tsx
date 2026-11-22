"use client";

import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { updateProfileAction, type FormState } from "@/lib/actions/settings";

const initial: FormState = {};

export function SettingsProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, initial);
  return (
    <form action={action} className="mt-4 flex max-w-md flex-col gap-4">
      <Field label="নাম" htmlFor="name" required>
        <Input id="name" name="name" defaultValue={name} required />
      </Field>
      <Field label="ইমেইল (পরিবর্তনযোগ্য নয়)" htmlFor="email">
        <Input id="email" defaultValue={email} disabled />
      </Field>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}
        </Button>
      </div>
    </form>
  );
}
