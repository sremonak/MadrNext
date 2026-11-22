import { prisma } from "@/lib/db";
import { Mail, MapPin, Phone } from "lucide-react";
import { SectionTitle } from "@/components/ui";
import { ContactForm } from "./contact-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "যোগাযোগ" };

export default async function ContactPage() {
  const unread = await prisma.contactMessage.count({ where: { status: "NEW" } });
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      <SectionTitle
        title="যোগাযোগ করুন"
        sub="কোর্স, পেমেন্ট বা কারিগরি সহায়তায় আমাদের সাথে কথা বলুন। সাধারণত ২৪ ঘণ্টার মধ্যে উত্তর দেওয়া হয়।"
      />
      <div className="grid gap-10 md:grid-cols-[1fr_300px]">
        <ContactForm />
        <aside className="h-fit space-y-5 rounded-lg border border-line bg-surface p-6">
          <div>
            <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <Phone size={15} className="text-teal" /> হেল্পলাইন
            </p>
            <p className="tabnum mt-1 text-[14px] text-muted">০৯৬XX-XXXXXX (সকাল ৯টা – রাত ১০টা)</p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <Mail size={15} className="text-teal" /> ইমেইল
            </p>
            <p className="mt-1 text-[14px] text-muted">hello@madrnext.app</p>
          </div>
          <div>
            <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
              <MapPin size={15} className="text-teal" /> ঠিকানা
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-muted">ঢাকা, বাংলাদেশ</p>
          </div>
          <p className="border-t border-line pt-4 text-[12.5px] text-muted">
            আমরা সব বার্তা সিরিয়াসলি নিই — এখন পর্যন্ত {unread > 0 ? `${unread.toLocaleString("bn-IN")}টি নতুন` : "কোনো নতুন"} বার্তা
            প্রক্রিয়াধীন আছে।
          </p>
        </aside>
      </div>
    </div>
  );
}
