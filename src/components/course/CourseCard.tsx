import Link from "next/link";
import { Clock, Layers, LockKeyhole, PlayCircle, User } from "lucide-react";
import { CourseCover } from "@/components/course/CourseCover";
import { Badge } from "@/components/ui";
import { bnDigits, formatDurationBn, formatTaka } from "@/lib/format";

export interface CourseCardData {
  id: string;
  slug: string;
  titleBn: string;
  subtitleBn: string | null;
  level: "DAKHIL" | "ALIM" | "GENERAL";
  pricePaisa: number;
  discountPaisa: number | null;
  discountEndsAt: Date | null;
  durationMinutes: number;
  thumbnailSeed: number;
  instructorName?: string | null;
  lessonCount: number;
  isFree?: boolean;
  isEnrolled?: boolean;
  isPreview?: boolean;
}

const LEVEL_LABEL = {
  DAKHIL: "দাখিল",
  ALIM: "আলিম",
  GENERAL: "জেনারেল",
} as const;

export function CourseCard({ course }: { course: CourseCardData }) {
  const hasDiscount =
    course.discountPaisa !== null && course.discountPaisa < course.pricePaisa;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-line-strong">
      <Link href={`/courses/${course.slug}`} className="relative block" tabIndex={-1} aria-hidden="true">
        <CourseCover
          seed={course.thumbnailSeed}
          title={course.titleBn}
          level={LEVEL_LABEL[course.level]}
          className="h-40 w-full object-cover"
        />
        {course.isEnrolled ? (
          <span className="absolute left-3 top-3">
            <Badge tone="success">সক্রিয় এনরোলমেন্ট</Badge>
          </span>
        ) : course.isPreview ? (
          <span className="absolute left-3 top-3">
            <Badge tone="info">ফ্রি প্রিভিউ</Badge>
          </span>
        ) : (
          <span className="absolute left-3 top-3">
            <Badge tone={hasDiscount ? "gold" : "neutral"}>
              {hasDiscount ? "ডিসকাউন্ট চলছে" : LEVEL_LABEL[course.level]}
            </Badge>
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 text-[12.5px] text-muted">
          <span>{LEVEL_LABEL[course.level]}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Layers size={13} /> {bnDigits(course.lessonCount)} পাঠ
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock size={13} /> {formatDurationBn(course.durationMinutes)}
          </span>
        </div>
        <h3 className="display mt-2 text-[17.5px] font-bold leading-snug text-ink">
          <Link href={`/courses/${course.slug}`} className="hover:text-teal">
            {course.titleBn}
          </Link>
        </h3>
        {course.subtitleBn && (
          <p className="mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed text-muted">
            {course.subtitleBn}
          </p>
        )}
        {course.instructorName && (
          <p className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] text-muted">
            <User size={13} /> {course.instructorName}
          </p>
        )}
        <div className="mt-3.5 flex items-center justify-between border-t border-line pt-3.5">
          {course.isFree || course.pricePaisa === 0 ? (
            <span className="display text-[17px] font-bold text-success">ফ্রি</span>
          ) : (
            <span className="flex items-baseline gap-2">
              <span className="display text-[17px] font-bold text-ink">
                {formatTaka(hasDiscount ? course.discountPaisa! : course.pricePaisa)}
              </span>
              {hasDiscount && (
                <span className="text-[13px] text-muted line-through">
                  {formatTaka(course.pricePaisa)}
                </span>
              )}
            </span>
          )}
          <Link
            href={`/courses/${course.slug}`}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-teal transition-colors hover:text-teal-deep"
          >
            {course.isEnrolled ? (
              <>
                <PlayCircle size={15} /> চালিয়ে যান
              </>
            ) : (
              <>
                <LockKeyhole size={14} /> কোর্স দেখুন
              </>
            )}
          </Link>
        </div>
      </div>
    </article>
  );
}
