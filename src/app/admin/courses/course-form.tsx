"use client";

import { useActionState } from "react";
import { createCourseAction } from "@/lib/actions/admin";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";

export function CreateCourseForm({
  categories,
  subjects,
  teachers,
}: {
  categories: { id: string; nameBn: string; level: string }[];
  subjects: { id: string; nameBn: string; level: string }[];
  teachers: { id: string; nameBn: string }[];
}) {
  const [state, action, pending] = useActionState(createCourseAction, {});

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <Field label="শিরোনাম (বাংলা)" htmlFor="titleBn" required>
        <Input id="titleBn" name="titleBn" required placeholder="যেমন: আল কুরআন ও তাজবীদ — ৯ম শ্রেণি" />
      </Field>
      <Field label="Title (English)" htmlFor="titleEn" required>
        <Input id="titleEn" name="titleEn" required placeholder="Al Quran & Tajweed — Class 9" />
      </Field>
      <Field label="সাবটাইটেল" htmlFor="subtitleBn">
        <Input id="subtitleBn" name="subtitleBn" placeholder="সংক্ষিপ্ত বিবরণ" />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="লেভেল" htmlFor="level" required>
          <Select id="level" name="level" defaultValue="DAKHIL">
            <option value="DAKHIL">দাখিল</option>
            <option value="ALIM">আলিম</option>
          </Select>
        </Field>
        <Field label="শ্রেণি" htmlFor="classNumber">
          <Select id="classNumber" name="classNumber" defaultValue="9">
            <option value="9">৯ম</option>
            <option value="10">১০ম</option>
            <option value="11">১১শ</option>
            <option value="12">১২শ</option>
          </Select>
        </Field>
      </div>
      <Field label="ক্যাটাগরি" htmlFor="categoryId" required>
        <Select id="categoryId" name="categoryId" required>
          <option value="">— নির্বাচন করুন —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameBn} ({c.level === "DAKHIL" ? "দাখিল" : c.level === "ALIM" ? "আলিম" : "জেনারেল"})
            </option>
          ))}
        </Select>
      </Field>
      <Field label="বিষয়" htmlFor="subjectId">
        <Select id="subjectId" name="subjectId" defaultValue="">
          <option value="">— নির্বাচন করুন —</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nameBn}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="শিক্ষক" htmlFor="instructorId">
        <Select id="instructorId" name="instructorId" defaultValue="">
          <option value="">— নির্বাচন করুন —</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nameBn}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="মূল্য (টাকা)" htmlFor="priceTaka" required>
          <Input id="priceTaka" name="priceTaka" type="number" min="0" defaultValue="1000" required />
        </Field>
        <Field label="ডিসকাউন্ট মূল্য (টাকা)" htmlFor="discountTaka">
          <Input id="discountTaka" name="discountTaka" type="number" min="0" placeholder="ঐচ্ছিক" />
        </Field>
      </div>
      <div className="flex items-center gap-6 md:col-span-2">
        <label className="flex items-center gap-2 text-[13.5px] text-ink">
          <input type="checkbox" name="isFeatured" className="accent-[#0c5b53]" /> হোমপেজে ফিচার করুন
        </label>
        <label className="flex items-center gap-2 text-[13.5px] text-ink">
          <input type="checkbox" name="hasCertificate" className="accent-[#0c5b53]" /> সার্টিফিকেট চালু
        </label>
      </div>
      <div className="md:col-span-2">
        <Field label="বর্ণনা" htmlFor="descriptionBn">
          <Textarea id="descriptionBn" name="descriptionBn" rows={4} />
        </Field>
      </div>
      {state.error && <div className="md:col-span-2"><Alert tone="danger">{state.error}</Alert></div>}
      {state.ok && <div className="md:col-span-2"><Alert tone="success">কোর্স তৈরি হয়েছে — খসড়া অবস্থায় আছে।</Alert></div>}
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "তৈরি হচ্ছে…" : "কোর্স তৈরি করুন"}
        </Button>
      </div>
    </form>
  );
}
