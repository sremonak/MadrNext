import { SectionTitle } from "@/components/ui";
import { HeroArch } from "@/components/brand/HeroArch";

export const metadata = { title: "আমাদের সম্পর্কে" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
      <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div>
          <SectionTitle
            title="MadrNext সম্পর্কে"
            sub="মাদরাসা শিক্ষার্থীদের জন্য নির্মিত আধুনিক লার্নিং প্ল্যাটফর্ম।"
            as="h1"
          />
          <div className="space-y-4 text-[15px] leading-relaxed text-muted">
            <p>
              লক্ষ লক্ষ দাখিল ও আলিম শিক্ষার্থী প্রতি বছর বোর্ড পরীক্ষায় অংশ নেন — কিন্তু বিষয়ভিত্তিক
              মানসম্মত ভিডিও ক্লাস, নোট আর পরীক্ষার ব্যবস্থা এক জায়গায় পাওয়া যায় না। এই শূন্যতা
              পূরণের জন্যই MadrNext।
            </p>
            <p>
              আমাদের প্ল্যাটফর্মে আল কুরআন ও তাজবীদ, আল হাদিস, ফিকহ, আরবি — এবং বাংলা, ইংরেজি,
              গণিত, বিজ্ঞান — প্রতিটি বিষয়ে চ্যাপ্টারভিত্তিক কোর্স থাকে। প্রতিটি পাঠের সাথে থাকে
              প্র্যাকটিস পরীক্ষা, নোট ও প্রগ্রেস ট্র্যাকিং।
            </p>
            <p>
              আমরা বিশ্বাস করি শিক্ষার মাধ্যম আধুনিক হলেও মূল্যবোধ অটুট থাকবে। এজন্যই প্ল্যাটফর্মের
              নাম, ভাষা ও ডিজাইন — সবকিছুতে মাদরাসা শিক্ষার্থীর বিবেচনাকে প্রাধান্য দেওয়া হয়েছে।
            </p>
          </div>
        </div>
        <HeroArch className="mx-auto w-full max-w-[300px] text-ink" />
      </div>

      <section className="mt-14">
        <SectionTitle title="আমাদের নীতি" />
        <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
          {[
            { t: "গুণগত শিক্ষা", d: "প্রতিটি কোর্স বিষয়-বিশেষজ্ঞ শিক্ষক দ্বারা প্রস্তুত ও পর্যালোচিত।" },
            { t: "নিরাপত্তা ও সম্মান", d: "শিক্ষার্থীর তথ্য সুরক্ষিত; কোর্স কনটেন্ট অননুমোদিত বিতরণ থেকে সুরক্ষিত।" },
            { t: "সহজপ্রাপ্যতা", d: "সাশ্রয়ী মূল্য, বাংলা ইন্টারফেস, যেকোনো ডিভাইসে প্রবেশযোগ্য।" },
          ].map((item) => (
            <div key={item.t} className="bg-surface p-6">
              <h3 className="display text-[17px] font-bold text-ink">{item.t}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{item.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
