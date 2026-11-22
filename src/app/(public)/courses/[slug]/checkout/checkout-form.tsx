"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Info, Smartphone } from "lucide-react";
import { startCheckoutAction, enrollFreeAction, type CheckoutState } from "@/lib/actions/checkout";
import { Alert, Badge, Button, Card, Field, Input, Select } from "@/components/ui";
import { formatTaka } from "@/lib/format";

const initial: CheckoutState = {};

interface Props {
  courseId: string;
  courseTitle: string;
  pricePaisa: number;
  discountPaisa: number | null;
  isFree: boolean;
  studentName: string;
  slug: string;
}

export function CheckoutForm({ courseId, courseTitle, pricePaisa, discountPaisa, isFree, studentName, slug }: Props) {
  const [state, action, pending] = useActionState(startCheckoutAction, initial);
  const router = useRouter();

  useEffect(() => {
    if (state.redirectUrl) router.push(state.redirectUrl);
  }, [state.redirectUrl, router]);

  if (isFree) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="display text-[18px] font-bold text-ink">{courseTitle}</p>
            <p className="mt-1 text-[14px] text-muted">এই কোর্সটি সম্পূর্ণ ফ্রি — সরাসরি এনরোল করুন।</p>
          </div>
          <span className="display text-[20px] font-bold text-success">ফ্রি</span>
        </div>
        <form action={enrollFreeAction.bind(null, courseId, slug)} className="mt-5">
          <Button type="submit" size="lg" className="w-full">
            ফ্রি এনরোল করুন
          </Button>
        </form>
      </Card>
    );
  }

  const base = discountPaisa ?? pricePaisa;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_260px]">
      <Card className="p-6">
        <form action={action} className="flex flex-col gap-5">
          <input type="hidden" name="courseId" value={courseId} />
          <Field label="পেমেন্ট মাধ্যম" htmlFor="method" required>
            <Select id="method" name="method" defaultValue="MANUAL">
              <option value="MANUAL">বিকাশ / নগদ — Send Money (ম্যানুয়াল যাচাই)</option>
              <option value="BKASH">বিকাশ — টোকেনাইজড চেকআউট</option>
              <option value="NAGAD">নগদ</option>
              <option value="SSLCOMMERZ">SSLCommerz (কার্ড/মোবাইল ব্যাংকিং)</option>
            </Select>
          </Field>
          <Field label="কুপন কোড (ঐচ্ছিক)" htmlFor="couponCode">
            <Input id="couponCode" name="couponCode" placeholder="যেমন EID25" />
          </Field>

          <div className="rounded-md border border-line bg-paper p-4">
            <p className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
              <Smartphone size={15} className="text-teal" /> ম্যানুয়াল পেমেন্টের নিয়ম
            </p>
            <ol className="mt-2 list-decimal space-y-1.5 pr-4 text-[13.5px] leading-relaxed text-muted">
              <li>নিচের নম্বরে <b className="text-ink">Send Money</b> করুন (Reference-এ কোর্সের নাম লিখুন)।</li>
              <li>বিকাশ/নগদ দেবে একটি TrxID — সেটি নিচের ফর্মে জমা দিন।</li>
              <li>অ্যাডমিন TrxID যাচাই করে এনরোলমেন্ট চালু করবেন।</li>
            </ol>
          </div>

          <Field label="যে নম্বর থেকে পাঠিয়েছেন" htmlFor="senderNumber">
            <Input id="senderNumber" name="senderNumber" inputMode="numeric" placeholder="01712345678" />
          </Field>
          <Field label="ট্রানজেকশন আইডি (TrxID)" htmlFor="manualTxnId" required>
            <Input id="manualTxnId" name="manualTxnId" placeholder="যেমন 9F7HK2MA" />
          </Field>

          {state.error && <Alert tone="danger">{state.error}</Alert>}
          {state.success && (
            <>
              <Alert tone="success">{state.success}</Alert>
              {state.manual && (
                <Alert tone="info" title="রেকর্ড">
                  <p>ইনভয়েস: <b className="tabnum">{state.manual.invoice}</b></p>
                  <p className="mt-1 text-[13px]">এনরোলমেন্ট স্ট্যাটাস ড্যাশবোর্ডে দেখুন।</p>
                </Alert>
              )}
            </>
          )}
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "জমা হচ্ছে…" : "পেমেন্ট জমা দিন"}
          </Button>
        </form>
      </Card>

      <Card className="h-fit p-5">
        <h2 className="text-[13px] font-semibold text-muted">অর্ডার সারসংক্ষেপ</h2>
        <dl className="mt-3 space-y-2.5 text-[14px]">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">কোর্স</dt>
            <dd className="text-right font-medium text-ink">{courseTitle}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">মূল্য</dt>
            <dd className="tabnum text-ink">{formatTaka(pricePaisa)}</dd>
          </div>
          {discountPaisa !== null && discountPaisa < pricePaisa && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">ডিসকাউন্ট</dt>
              <dd className="tabnum text-success">−{formatTaka(pricePaisa - discountPaisa)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-3">
            <dt className="font-semibold text-ink">মোট</dt>
            <dd className="display tabnum text-[17px] font-bold text-ink">{formatTaka(base)}</dd>
          </div>
          <div className="flex justify-between gap-3 pt-1">
            <dt className="text-muted">শিক্ষার্থী</dt>
            <dd className="text-ink">{studentName}</dd>
          </div>
        </dl>
        <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-muted">
          <Info size={14} className="mt-0.5 shrink-0 text-teal" />
          পেমেন্ট সবসময় সার্ভারে যাচাই হয় — ব্রাউজার রিডাইরেক্টের ভিত্তিতে কখনো এনরোলমেন্ট চালু হয় না।
        </p>
        <div className="mt-3">
          <Badge tone="gold">৳ কারেন্সি: BDT</Badge>
        </div>
      </Card>
    </div>
  );
}
