"use client";

import { useActionState } from "react";
import { createAdminAction, setAdminRoleAction } from "@/lib/actions/admin";
import { Alert, Button, Field, Input, Select } from "@/components/ui";

export function AdminCreateForm() {
  const [state, action, pending] = useActionState(createAdminAction, {});
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <Field label="নাম" htmlFor="adm-n" required>
        <Input id="adm-n" name="name" required />
      </Field>
      <Field label="ইমেইল" htmlFor="adm-e" required>
        <Input id="adm-e" name="email" type="email" required />
      </Field>
      <Field label="সাময়িক পাসওয়ার্ড" htmlFor="adm-p" hint="কমপক্ষে ১০ অক্ষর — নিরাপদ চ্যানেলে জানান" required>
        <Input id="adm-p" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="পদবি" htmlFor="adm-d">
        <Input id="adm-d" name="designation" placeholder="যেমন: পেমেন্ট ম্যানেজার" />
      </Field>
      <Field label="রোল" htmlFor="adm-r" required>
        <Select id="adm-r" name="role" defaultValue="ADMIN">
          <option value="SUPPORT_AGENT">Support Agent</option>
          <option value="PAYMENT_MANAGER">Payment Manager</option>
          <option value="COURSE_MANAGER">Course Manager</option>
          <option value="ADMIN">Admin</option>
        </Select>
      </Field>
      <div className="flex items-end md:col-span-2">
        <Button type="submit" disabled={pending}>{pending ? "তৈরি হচ্ছে…" : "অ্যাডমিন তৈরি করুন"}</Button>
      </div>
      {state.error && <div className="md:col-span-2"><Alert tone="danger">{state.error}</Alert></div>}
      {state.ok && <div className="md:col-span-2"><Alert tone="success">অ্যাডমিন তৈরি হয়েছে।</Alert></div>}
    </form>
  );
}

export function AdminRoleSelect({ userId, role }: { userId: string; role: string }) {
  return (
    <Select
      defaultValue={role}
      onChange={(e) => setAdminRoleAction(userId, e.target.value).then(() => window.location.reload())}
      className="!h-9 w-44"
      aria-label="রোল পরিবর্তন"
    >
      <option value="SUPPORT_AGENT">Support Agent</option>
      <option value="PAYMENT_MANAGER">Payment Manager</option>
      <option value="COURSE_MANAGER">Course Manager</option>
      <option value="ADMIN">Admin</option>
      <option value="SUPER_ADMIN">Super Admin</option>
    </Select>
  );
}
