"use client";

import { useActionState } from "react";
import { saveFaqAction, saveTestimonialAction, saveAnnouncementAction } from "@/lib/actions/admin";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";

export function ContentForms({ courses }: { courses: { id: string; titleBn: string }[] }) {
  const [faqState, faqAction, faqPending] = useActionState(saveFaqAction, {});
  const [testState, testAction, testPending] = useActionState(saveTestimonialAction, {});
  const [annState, annAction, annPending] = useActionState(saveAnnouncementAction, {});

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <details className="rounded-lg border border-line bg-surface">
        <summary className="cursor-pointer list-none px-5 py-4 text-[14.5px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
          + নতুন FAQ যোগ করুন
        </summary>
        <form action={faqAction} className="flex flex-col gap-4 border-t border-line p-5">
          <Field label="প্রশ্ন" htmlFor="faq-q" required>
            <Input id="faq-q" name="questionBn" required />
          </Field>
          <Field label="উত্তর" htmlFor="faq-a" required>
            <Textarea id="faq-a" name="answerBn" rows={3} required />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="ক্যাটাগরি" htmlFor="faq-c">
              <Select id="faq-c" name="category" defaultValue="general">
                <option value="general">সাধারণ</option>
                <option value="payment">পেমেন্ট</option>
                <option value="security">নিরাপত্তা</option>
              </Select>
            </Field>
            <Field label="ক্রম" htmlFor="faq-o">
              <Input id="faq-o" name="order" type="number" defaultValue="0" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-[13.5px] text-ink">
            <input type="checkbox" name="isActive" defaultChecked className="accent-[#0c5b53]" /> সক্রিয়
          </label>
          {faqState.error && <Alert tone="danger">{faqState.error}</Alert>}
          {faqState.ok && <Alert tone="success">FAQ সংরক্ষিত।</Alert>}
          <Button type="submit" disabled={faqPending}>{faqPending ? "…" : "সংরক্ষণ করুন"}</Button>
        </form>
      </details>

      <details className="rounded-lg border border-line bg-surface">
        <summary className="cursor-pointer list-none px-5 py-4 text-[14.5px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
          + নতুন টেস্টিমোনিয়াল যোগ করুন
        </summary>
        <form action={testAction} className="flex flex-col gap-4 border-t border-line p-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="নাম (বাংলা)" htmlFor="t-n" required>
              <Input id="t-n" name="nameBn" required />
            </Field>
            <Field label="Name (English)" htmlFor="t-e" required>
              <Input id="t-e" name="nameEn" required />
            </Field>
          </div>
          <Field label="পরিচিতি (যেমন: দাখিল ২০২৫, ঢাকা)" htmlFor="t-r" required>
            <Input id="t-r" name="roleBn" required />
          </Field>
          <Field label="উদ্ধৃতি" htmlFor="t-q" required>
            <Textarea id="t-q" name="quoteBn" rows={3} required />
          </Field>
          <label className="flex items-center gap-2 text-[13.5px] text-ink">
            <input type="checkbox" name="isActive" defaultChecked className="accent-[#0c5b53]" /> সক্রিয়
          </label>
          {testState.error && <Alert tone="danger">{testState.error}</Alert>}
          {testState.ok && <Alert tone="success">টেস্টিমোনিয়াল সংরক্ষিত।</Alert>}
          <Button type="submit" disabled={testPending}>{testPending ? "…" : "সংরক্ষণ করুন"}</Button>
        </form>
      </details>

      <details className="rounded-lg border border-line bg-surface lg:col-span-2">
        <summary className="cursor-pointer list-none px-5 py-4 text-[14.5px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
          + নতুন ঘোষণা প্রকাশ করুন
        </summary>
        <form action={annAction} className="flex flex-col gap-4 border-t border-line p-5">
          <Field label="শিরোনাম" htmlFor="a-t" required>
            <Input id="a-t" name="titleBn" required />
          </Field>
          <Field label="বিষয়বস্তু" htmlFor="a-b" required>
            <Textarea id="a-b" name="bodyBn" rows={3} required />
          </Field>
          <Field label="স্কোপ" htmlFor="a-c">
            <Select id="a-c" name="courseId" defaultValue="">
              <option value="">সার্বজনীন (সব শিক্ষার্থী)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.titleBn}</option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-[13.5px] text-ink">
            <input type="checkbox" name="isPublished" defaultChecked className="accent-[#0c5b53]" /> প্রকাশ করুন
          </label>
          {annState.error && <Alert tone="danger">{annState.error}</Alert>}
          {annState.ok && <Alert tone="success">ঘোষণা প্রকাশিত — প্রাসঙ্গিক শিক্ষার্থীদের নোটিফিকেশন গেছে।</Alert>}
          <Button type="submit" disabled={annPending}>{annPending ? "…" : "প্রকাশ করুন"}</Button>
        </form>
      </details>
    </div>
  );
}
