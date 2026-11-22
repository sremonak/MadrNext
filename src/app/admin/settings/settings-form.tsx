"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "@/lib/actions/admin";
import { Alert, Button, Field, Input } from "@/components/ui";

export function SettingsForm({ values, disabled }: { values: Record<string, string>; disabled: boolean }) {
  const [state, action, pending] = useActionState(saveSettingsAction, {});

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <Field label="সাইটের নাম (বাংলা)" htmlFor="siteNameBn">
        <Input id="siteNameBn" name="siteNameBn" defaultValue={values.siteNameBn ?? "MadrNext"} disabled={disabled} />
      </Field>
      <Field label="সাপোর্ট ফোন" htmlFor="supportPhone">
        <Input id="supportPhone" name="supportPhone" defaultValue={values.supportPhone ?? ""} disabled={disabled} />
      </Field>
      <Field label="সাপোর্ট ইমেইল" htmlFor="supportEmail">
        <Input id="supportEmail" name="supportEmail" type="email" defaultValue={values.supportEmail ?? "hello@madrnext.app"} disabled={disabled} />
      </Field>
      <Field label="ম্যানুয়াল পেমেন্ট নম্বর (বিকাশ/নগদ)" htmlFor="manualPaymentNumber" hint="চেকআউট পেজে শিক্ষার্থীরা এই নম্বর দেখবে">
        <Input id="manualPaymentNumber" name="manualPaymentNumber" defaultValue={values.manualPaymentNumber ?? ""} disabled={disabled} />
      </Field>
      <Field label="সর্বোচ্চ ডিভাইস সেশন" htmlFor="maxConcurrentSessions">
        <Input id="maxConcurrentSessions" name="maxConcurrentSessions" type="number" min="1" max="10" defaultValue={values.maxConcurrentSessions ?? "3"} disabled={disabled} />
      </Field>
      <Field label="সর্বোচ্চ একযোগী প্লেব্যাক" htmlFor="maxConcurrentPlaybacks">
        <Input id="maxConcurrentPlaybacks" name="maxConcurrentPlaybacks" type="number" min="1" max="5" defaultValue={values.maxConcurrentPlaybacks ?? "2"} disabled={disabled} />
      </Field>
      <Field label="সেশন মেয়াদ (ঘণ্টা)" htmlFor="sessionTtlHours">
        <Input id="sessionTtlHours" name="sessionTtlHours" type="number" min="1" max="720" defaultValue={values.sessionTtlHours ?? "72"} disabled={disabled} />
      </Field>
      {state.error && <div className="md:col-span-2"><Alert tone="danger">{state.error}</Alert></div>}
      {state.ok && <div className="md:col-span-2"><Alert tone="success">সেটিংস সংরক্ষিত।</Alert></div>}
      {!disabled && (
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>{pending ? "সংরক্ষণ হচ্ছে…" : "সংরক্ষণ করুন"}</Button>
        </div>
      )}
    </form>
  );
}
