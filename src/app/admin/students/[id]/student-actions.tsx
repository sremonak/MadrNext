"use client";

import { useState, useTransition } from "react";
import { Ban, CheckCircle2, PlusCircle, RotateCcw } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { setStudentStatusAction, grantCourseAccessAction, revokeCourseAccessAction } from "@/lib/actions/admin";

interface EnrollmentView { courseId: string; courseTitle: string; status: string }

export function StudentActions({
  userId,
  status,
  enrollments,
}: {
  userId: string;
  status: string;
  enrollments: EnrollmentView[];
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [granting, setGranting] = useState(false);
  const [courses, setCourses] = useState<{ id: string; titleBn: string }[]>([]);

  function toggleStatus() {
    start(async () => {
      const next = status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
      const err = await setStudentStatusAction(userId, next, next === "SUSPENDED" ? "অ্যাডমিন কর্তৃক স্থগিত" : undefined);
      setMessage(err ?? (next === "SUSPENDED" ? "অ্যাকাউন্ট স্থগিত করা হয়েছে" : "অ্যাকাউন্ট পুনঃসক্রিয় করা হয়েছে"));
      if (!err) window.location.reload();
    });
  }

  function loadCourses() {
    setGranting((g) => !g);
    if (courses.length === 0) {
      fetch("/api/admin/courses?published=1")
        .then((r) => r.json())
        .then((d) => setCourses(d.courses ?? []))
        .catch(() => setGranting(false));
    }
  }

  function grant(courseId: string) {
    start(async () => {
      const err = await grantCourseAccessAction(userId, courseId);
      setMessage(err ?? "অ্যাক্সেস প্রদান হয়েছে");
      if (!err) window.location.reload();
    });
  }

  function revoke(courseId: string) {
    start(async () => {
      const err = await revokeCourseAccessAction(userId, courseId, "অ্যাডমিন কর্তৃক বাতিল");
      setMessage(err ?? "অ্যাক্সেস বাতিল হয়েছে");
      if (!err) window.location.reload();
    });
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2">
        <Button variant={status === "SUSPENDED" ? "primary" : "danger"} size="sm" onClick={toggleStatus} disabled={pending}>
          {status === "SUSPENDED" ? (
            <>
              <CheckCircle2 size={14} /> পুনঃসক্রিয় করুন
            </>
          ) : (
            <>
              <Ban size={14} /> স্থগিত করুন
            </>
          )}
        </Button>
        <Button variant="secondary" size="sm" onClick={loadCourses}>
          <PlusCircle size={14} /> কোর্স অ্যাক্সেস দিন
        </Button>
      </div>
      {granting && (
        <div className="mt-3 w-full min-w-[260px]">
          <Select
            defaultValue=""
            onChange={(e) => e.target.value && grant(e.target.value)}
            aria-label="কোর্স বেছে নিন"
          >
            <option value="">— কোর্স বেছে নিন —</option>
            {courses
              .filter((c) => !enrollments.some((e) => e.courseId === c.id && e.status === "ACTIVE"))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titleBn}
                </option>
              ))}
          </Select>
          {enrollments.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {enrollments
                .filter((e) => e.status === "ACTIVE")
                .map((e) => (
                  <button
                    key={e.courseId}
                    onClick={() => revoke(e.courseId)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded-xs border border-line px-2 py-1 text-[12px] text-muted hover:border-danger hover:text-danger"
                    title="অ্যাক্সেস বাতিল"
                  >
                    <RotateCcw size={11} /> {e.courseTitle} বাতিল
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
      {message && (
        <p className="mt-2 text-[12.5px] text-muted" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
