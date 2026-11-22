import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { assertCourseAccess } from "@/lib/access";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "চেকআউট" };

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ free?: string }>;
}) {
  const { slug } = await params;
  const { free } = await searchParams;
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      titleBn: true,
      pricePaisa: true,
      discountPaisa: true,
      status: true,
    },
  });
  if (!course || course.status !== "PUBLISHED") notFound();

  const access = await assertCourseAccess(ctx.user.id, course.id);
  if (access.allowed) redirect(`/learn/courses/${slug}`);

  const currentPrice = course.discountPaisa ?? course.pricePaisa;
  const isFree = currentPrice === 0 && free !== "false";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="display text-[28px] font-bold text-ink">এনরোলমেন্ট সম্পন্ন করুন</h1>
      <p className="mt-2 text-[14.5px] text-muted">
        <span className="font-semibold text-ink">{course.titleBn}</span> — পেমেন্ট যাচাই হওয়ার পরেই কোর্সে
        অ্যাক্সেস চালু হবে।
      </p>
      <div className="mt-8">
        <CheckoutForm
          courseId={course.id}
          courseTitle={course.titleBn}
          pricePaisa={course.pricePaisa}
          discountPaisa={course.discountPaisa}
          isFree={isFree}
          studentName={ctx.user.name}
          slug={slug}
        />
      </div>
    </div>
  );
}
