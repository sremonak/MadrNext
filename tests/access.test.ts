import { afterAll, describe, expect, it } from "vitest";
import { assertCourseAccess } from "../src/lib/access";
import { makeCourse, makeStudent, prisma, uniq } from "./helpers";

describe("course access control (access denial & cross-student)", () => {
  let cleanup: string[] = [];

  it("denies a user who never enrolled", async () => {
    const student = await makeStudent();
    const course = await makeCourse();
    cleanup = [student.id, course.id];
    const result = await assertCourseAccess(student.id, course.id);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("NOT_ENROLLED");
  });

  it("allows an ACTIVE enrollment", async () => {
    const student = await makeStudent();
    const course = await makeCourse();
    const enrollment = await prisma.enrollment.create({
      data: { userId: student.id, courseId: course.id, status: "ACTIVE" },
    });
    const result = await assertCourseAccess(student.id, course.id);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("OK");
    expect(result.enrollmentId).toBe(enrollment.id);
    cleanup = [student.id, course.id];
  });

  it("denies PENDING (manual payment under review)", async () => {
    const student = await makeStudent();
    const course = await makeCourse();
    await prisma.enrollment.create({
      data: { userId: student.id, courseId: course.id, status: "PENDING" },
    });
    const result = await assertCourseAccess(student.id, course.id);
    expect(result).toMatchObject({ allowed: false, reason: "PENDING" });
    cleanup = [student.id, course.id];
  });

  it("denies EXPIRED access window", async () => {
    const student = await makeStudent();
    const course = await makeCourse();
    await prisma.enrollment.create({
      data: {
        userId: student.id, courseId: course.id, status: "ACTIVE",
        accessExpiresAt: new Date(Date.now() - 1000),
      },
    });
    const result = await assertCourseAccess(student.id, course.id);
    expect(result).toMatchObject({ allowed: false, reason: "EXPIRED" });
    cleanup = [student.id, course.id];
  });

  it("denies REVOKED enrollment (admin revoke)", async () => {
    const student = await makeStudent();
    const course = await makeCourse();
    await prisma.enrollment.create({
      data: { userId: student.id, courseId: course.id, status: "REVOKED" },
    });
    const result = await assertCourseAccess(student.id, course.id);
    expect(result).toMatchObject({ allowed: false, reason: "REVOKED" });
    cleanup = [student.id, course.id];
  });

  it("denies a suspended student even with ACTIVE enrollment", async () => {
    const student = await makeStudent({ status: "SUSPENDED" });
    const course = await makeCourse();
    await prisma.enrollment.create({
      data: { userId: student.id, courseId: course.id, status: "ACTIVE" },
    });
    const result = await assertCourseAccess(student.id, course.id);
    expect(result).toMatchObject({ allowed: false, reason: "USER_SUSPENDED" });
    cleanup = [student.id, course.id];
  });

  it("cross-student: A's enrollment never grants B access", async () => {
    const a = await makeStudent();
    const b = await makeStudent();
    const course = await makeCourse();
    await prisma.enrollment.create({
      data: { userId: a.id, courseId: course.id, status: "ACTIVE" },
    });
    const result = await assertCourseAccess(b.id, course.id);
    expect(result).toMatchObject({ allowed: false, reason: "NOT_ENROLLED" });
    cleanup = [a.id, b.id, course.id];
  });

  it("handles a non-existent user/course without throwing", async () => {
    const result = await assertCourseAccess(uniq("ghost"), uniq("ghost"));
    expect(result.allowed).toBe(false);
  });

  afterAll(async () => {
    // child rows cascade or are removed explicitly
    for (const courseId of cleanup) {
      await prisma.enrollment.deleteMany({ where: { courseId } });
      await prisma.payment.deleteMany({ where: { courseId } });
      await prisma.course.deleteMany({ where: { id: courseId } });
    }
    for (const userId of cleanup) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });
});
