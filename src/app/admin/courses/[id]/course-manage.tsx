"use client";

import { useState, useTransition } from "react";
import { Plus, FileText, Video, BookOpen } from "lucide-react";
import { addModuleAction, addLessonAction, updateCourseAction } from "@/lib/actions/admin";
import { Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { formatTaka } from "@/lib/format";

export function CourseSettingsPanel({
  courseId,
  status,
  pricePaisa,
  discountPaisa,
  enrollmentLimit,
}: {
  courseId: string;
  status: string;
  pricePaisa: number;
  discountPaisa: number | null;
  isFeatured: boolean;
  enrollmentLimit: number | null;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [price, setPrice] = useState(String(pricePaisa / 100));
  const [discount, setDiscount] = useState(discountPaisa !== null ? String(discountPaisa / 100) : "");
  const [limit, setLimit] = useState(enrollmentLimit === null ? "" : String(enrollmentLimit));

  function save(extra?: { status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" }) {
    start(async () => {
      const err = await updateCourseAction(courseId, {
        priceTaka: parseInt(price, 10) || 0,
        discountTaka: discount ? parseInt(discount, 10) : null,
        enrollmentLimit: limit ? parseInt(limit, 10) : null,
        ...extra,
      });
      setMsg(err ?? "সংরক্ষিত");
      if (!err && !extra) return;
      if (!err) window.location.reload();
    });
  }

  return (
    <Card className="mt-5 p-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-32">
          <label className="text-[12.5px] text-muted">মূল্য (৳)</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
            className="mt-1 h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-[14px] tabnum text-ink"
            inputMode="numeric"
          />
        </div>
        <div className="w-36">
          <label className="text-[12.5px] text-muted">ডিসকাউন্ট (৳)</label>
          <input
            value={discount}
            onChange={(e) => setDiscount(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="নেই"
            className="mt-1 h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-[14px] tabnum text-ink placeholder:text-muted"
            inputMode="numeric"
          />
        </div>
        <div className="w-28">
          <label className="text-[12.5px] text-muted">সিট সীমা</label>
          <input
            value={limit}
            onChange={(e) => setLimit(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="∞"
            className="mt-1 h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-[14px] tabnum text-ink placeholder:text-muted"
            inputMode="numeric"
          />
        </div>
        <Button size="md" variant="secondary" onClick={() => save()} disabled={pending}>
          {pending ? "…" : "সংরক্ষণ"}
        </Button>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          {status === "DRAFT" && (
            <Button size="md" onClick={() => save({ status: "PUBLISHED" })} disabled={pending}>
              প্রকাশ করুন
            </Button>
          )}
          {status === "PUBLISHED" && (
            <>
              <Badge tone="success">প্রকাশিত</Badge>
              <Button size="md" variant="secondary" onClick={() => save({ status: "ARCHIVED" })} disabled={pending}>
                আর্কাইভ করুন
              </Button>
            </>
          )}
          {status === "ARCHIVED" && (
            <Button size="md" onClick={() => save({ status: "PUBLISHED" })} disabled={pending}>
              পুনঃপ্রকাশ
            </Button>
          )}
        </div>
      </div>
      <p className="mt-3 text-[12.5px] text-muted">
        বর্তমান বিক্রয়মূল্য: <b className="tabnum text-ink">{formatTaka(discountPaisa ?? pricePaisa)}</b> — প্রকাশিত অবস্থায় শিক্ষার্থীরা এই মূল্যে কিনবে।
      </p>
      {msg && <p className="mt-1 text-[12.5px] text-teal" role="status">{msg}</p>}
    </Card>
  );
}

interface ModuleView {
  id: string;
  titleBn: string;
  lessons: { id: string; titleBn: string; type: string; isPreview: boolean }[];
}

export function CurriculumBuilder({ courseId, modules }: { courseId: string; modules: ModuleView[] }) {
  const [pending, start] = useTransition();
  const [modTitle, setModTitle] = useState("");
  const [openModule, setOpenModule] = useState<string | null>(modules[0]?.id ?? null);
  const [lessonForm, setLessonForm] = useState({ title: "", type: "VIDEO" as "VIDEO" | "DOCUMENT" | "TEXT", content: "", preview: false });
  const [msg, setMsg] = useState<string | null>(null);

  const TYPE_ICON = { VIDEO: Video, DOCUMENT: FileText, TEXT: BookOpen } as const;

  return (
    <div className="mt-4 space-y-4">
      {modules.map((mod, mi) => (
        <Card key={mod.id} className="overflow-hidden">
          <button
            onClick={() => setOpenModule(openModule === mod.id ? null : mod.id)}
            className="flex w-full items-baseline gap-3 bg-paper px-5 py-3.5 text-left"
          >
            <span className="display tabnum text-[15px] font-bold text-gold">{(mi + 1).toLocaleString("bn-IN")}.</span>
            <span className="flex-1 text-[15px] font-semibold text-ink">{mod.titleBn}</span>
            <span className="text-[12.5px] text-muted">{mod.lessons.length.toLocaleString("bn-IN")} পাঠ</span>
          </button>
          {openModule === mod.id && (
            <div className="border-t border-line">
              <ul className="divide-y divide-line">
                {mod.lessons.map((l, li) => {
                  const Icon = TYPE_ICON[(l.type as keyof typeof TYPE_ICON) ?? "TEXT"];
                  return (
                    <li key={l.id} className="flex items-center gap-3 px-5 py-2.5 text-[13.5px]">
                      <Icon size={15} className="text-teal" />
                      <span className="flex-1 text-ink">{l.titleBn}</span>
                      {l.isPreview && <Badge tone="gold">প্রিভিউ</Badge>}
                      <span className="tabnum text-[12px] text-muted">{(li + 1).toLocaleString("bn-IN")}</span>
                    </li>
                  );
                })}
                {mod.lessons.length === 0 && <li className="px-5 py-3 text-[13px] text-muted">কোনো পাঠ নেই — নিচে যোগ করুন।</li>}
              </ul>
              <div className="border-t border-line bg-paper p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[180px] flex-1">
                    <Input
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="নতুন পাঠের শিরোনাম"
                      aria-label="পাঠের শিরোনাম"
                    />
                  </div>
                  <div className="w-40">
                    <Select
                      value={lessonForm.type}
                      onChange={(e) => setLessonForm((f) => ({ ...f, type: e.target.value as never }))}
                      aria-label="পাঠের ধরন"
                    >
                      <option value="VIDEO">ভিডিও পাঠ</option>
                      <option value="DOCUMENT">PDF নোট</option>
                      <option value="TEXT">লেখা পাঠ</option>
                    </Select>
                  </div>
                  <label className="flex items-center gap-1.5 pb-2 text-[13px] text-ink">
                    <input
                      type="checkbox"
                      checked={lessonForm.preview}
                      onChange={(e) => setLessonForm((f) => ({ ...f, preview: e.target.checked }))}
                      className="accent-[#b98a2f]"
                    />
                    ফ্রি প্রিভিউ
                  </label>
                  <Button
                    size="sm"
                    disabled={pending || !lessonForm.title.trim()}
                    onClick={() =>
                      start(async () => {
                        const err = await addLessonAction({
                          moduleId: mod.id,
                          titleBn: lessonForm.title.trim(),
                          type: lessonForm.type,
                          contentBn: lessonForm.type === "TEXT" ? lessonForm.content || undefined : undefined,
                          isPreview: lessonForm.preview,
                        });
                        setMsg(err ?? "পাঠ যোগ হয়েছে");
                        if (!err) {
                          setLessonForm({ title: "", type: "VIDEO", content: "", preview: false });
                          window.location.reload();
                        }
                      })
                    }
                  >
                    <Plus size={14} /> যোগ করুন
                  </Button>
                </div>
                {lessonForm.type === "TEXT" && (
                  <textarea
                    value={lessonForm.content}
                    onChange={(e) => setLessonForm((f) => ({ ...f, content: e.target.value }))}
                    placeholder="পাঠের লেখা (ঐচ্ছিক)"
                    rows={3}
                    className="mt-3 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-[14px] text-ink"
                  />
                )}
                <p className="mt-2 text-[12px] text-muted">
                  ভিডিও পাঠে স্যাম্পল HLS অ্যাসেট যুক্ত হয় (সিকিউর টোকেন-স্ট্রিমিং ডেমো); PDF পাঠে সিকিউর ডকুমেন্ট যুক্ত হয়।
                  প্রোডাকশনে ভিডিও আপলোড পাইপলাইন সংযুক্ত হবে (docs/SECURITY.md)।
                </p>
              </div>
            </div>
          )}
        </Card>
      ))}

      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Field label="নতুন মডিউলের শিরোনাম" htmlFor="newModule">
              <Input
                id="newModule"
                value={modTitle}
                onChange={(e) => setModTitle(e.target.value)}
                placeholder="যেমন: অধ্যায় ১ — তিলাওয়াত ও তাজবীদ"
              />
            </Field>
          </div>
          <Button
            disabled={pending || !modTitle.trim()}
            onClick={() =>
              start(async () => {
                const err = await addModuleAction(courseId, modTitle.trim());
                setMsg(err ?? "মডিউল যোগ হয়েছে");
                if (!err) {
                  setModTitle("");
                  window.location.reload();
                }
              })
            }
          >
            <Plus size={15} /> মডিউল যোগ করুন
          </Button>
        </div>
        {msg && <p className="mt-2 text-[12.5px] text-teal">{msg}</p>}
      </Card>
    </div>
  );
}
