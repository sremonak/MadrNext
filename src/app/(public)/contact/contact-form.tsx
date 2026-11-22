"use client";

import { useActionState } from "react";
import { submitContactAction, type ContactState } from "@/lib/actions/contact";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";

const initial: ContactState = {};

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContactAction, initial);

  return (
    <form action={action} className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="আপনার নাম" htmlFor="name" required>
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field label="ইমেইল" htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="মোবাইল (ঐচ্ছিক)" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" placeholder="01712345678" />
        </Field>
        <Field label="বিষয়" htmlFor="subject" required>
          <Input id="subject" name="subject" placeholder="যেমন: কোর্স সম্পর্কে জানতে চাই" required />
        </Field>
      </div>
      <Field label="বার্তা" htmlFor="message" required>
        <Textarea id="message" name="message" rows={6} required />
      </Field>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "পাঠানো হচ্ছে…" : "বার্তা পাঠান"}
        </Button>
      </div>
    </form>
  );
}
