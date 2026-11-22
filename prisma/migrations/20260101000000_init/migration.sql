-- MadrNext initial schema (hand-written equivalent of prisma/schema.prisma)
-- Applied via psql in restricted sandboxes; `prisma migrate deploy` in prod.

CREATE TYPE "Role" AS ENUM ('STUDENT', 'SUPPORT_AGENT', 'PAYMENT_MANAGER', 'COURSE_MANAGER', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED');
CREATE TYPE "DeviceType" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET', 'OTHER');
CREATE TYPE "CourseLevel" AS ENUM ('DAKHIL', 'ALIM', 'GENERAL');
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'DOCUMENT', 'TEXT');
CREATE TYPE "VideoProvider" AS ENUM ('LOCAL_HLS', 'S3_SIGNED_CDN', 'EXTERNAL_DRM');
CREATE TYPE "AssetStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'REVOKED');
CREATE TYPE "EnrollmentSource" AS ENUM ('PAYMENT', 'MANUAL_GRANT', 'FREE_ENROLLMENT');
CREATE TYPE "PaymentMethod" AS ENUM ('BKASH', 'NAGAD', 'SSLCOMMERZ', 'MANUAL', 'FREE');
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'PENDING_REVIEW', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');
CREATE TYPE "CouponType" AS ENUM ('PERCENT', 'FIXED_PAISA');
CREATE TYPE "VerificationChannel" AS ENUM ('EMAIL', 'SMS');
CREATE TYPE "VerificationPurpose" AS ENUM ('ACCOUNT_VERIFICATION', 'LOGIN_OTP', 'PASSWORD_RESET');
CREATE TYPE "ExamType" AS ENUM ('MCQ_PRACTICE', 'CHAPTER_TEST', 'MODEL_TEST');
CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');
CREATE TYPE "AssetType" AS ENUM ('VIDEO', 'DOCUMENT');
CREATE TYPE "NotificationType" AS ENUM ('ENROLLMENT', 'PAYMENT', 'LESSON_ANNOUNCEMENT', 'COURSE_UPDATE', 'EXAM_REMINDER', 'SECURITY_ALERT', 'SYSTEM');
CREATE TYPE "ContactStatus" AS ENUM ('NEW', 'READ', 'REPLIED');

-- Identity & access ---------------------------------------------------------

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'STUDENT',
  "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "emailVerifiedAt" TIMESTAMP(3),
  "phoneVerifiedAt" TIMESTAMP(3),
  "mfaSecret" TEXT,
  "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  "avatarColor" TEXT NOT NULL DEFAULT 'teal',
  "locale" TEXT NOT NULL DEFAULT 'bn',
  "lastLoginAt" TIMESTAMP(3),
  "suspendedAt" TIMESTAMP(3),
  "suspensionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

CREATE TABLE "StudentProfile" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "level" "CourseLevel",
  "classNumber" INTEGER,
  "institution" TEXT,
  "district" TEXT,
  "bio" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");
CREATE UNIQUE INDEX "StudentProfile_studentId_key" ON "StudentProfile"("studentId");

CREATE TABLE "AdminProfile" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "designation" TEXT,
  "phone" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminProfile_userId_key" ON "AdminProfile"("userId");

CREATE TABLE "DeviceTrust" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "deviceKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "deviceType" "DeviceType" NOT NULL DEFAULT 'OTHER',
  "os" TEXT,
  "browser" TEXT,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "DeviceTrust_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeviceTrust_userId_deviceKey_key" ON "DeviceTrust"("userId", "deviceKey");
CREATE INDEX "DeviceTrust_userId_lastSeenAt_idx" ON "DeviceTrust"("userId", "lastSeenAt");

CREATE TABLE "Session" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "deviceId" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "revokedReason" TEXT,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE TABLE "LoginHistory" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT,
  "email" TEXT,
  "success" BOOLEAN NOT NULL,
  "reason" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LoginHistory_userId_createdAt_idx" ON "LoginHistory"("userId", "createdAt");
CREATE INDEX "LoginHistory_email_createdAt_idx" ON "LoginHistory"("email", "createdAt");

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

CREATE TABLE "VerificationCode" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "channel" "VerificationChannel" NOT NULL,
  "purpose" "VerificationPurpose" NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VerificationCode_userId_purpose_channel_idx" ON "VerificationCode"("userId", "purpose", "channel");

-- Catalog -------------------------------------------------------------------

CREATE TABLE "CourseCategory" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "slug" TEXT NOT NULL,
  "nameBn" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "level" "CourseLevel" NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "CourseCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseCategory_slug_key" ON "CourseCategory"("slug");
CREATE INDEX "CourseCategory_level_order_idx" ON "CourseCategory"("level", "order");

CREATE TABLE "Subject" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "slug" TEXT NOT NULL,
  "nameBn" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "level" "CourseLevel" NOT NULL,
  "categoryId" TEXT,
  "description" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subject_slug_key" ON "Subject"("slug");
CREATE INDEX "Subject_level_order_idx" ON "Subject"("level", "order");
CREATE INDEX "Subject_categoryId_idx" ON "Subject"("categoryId");

CREATE TABLE "TeacherProfile" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT,
  "nameBn" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "designationBn" TEXT NOT NULL,
  "designationEn" TEXT NOT NULL,
  "bioBn" TEXT,
  "bioEn" TEXT,
  "education" TEXT,
  "photoUrl" TEXT,
  "accentColor" TEXT NOT NULL DEFAULT 'teal',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "TeacherProfile"("userId");
CREATE INDEX "TeacherProfile_isActive_order_idx" ON "TeacherProfile"("isActive", "order");

CREATE TABLE "Course" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "slug" TEXT NOT NULL,
  "titleBn" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "subtitleBn" TEXT,
  "subtitleEn" TEXT,
  "descriptionBn" TEXT,
  "descriptionEn" TEXT,
  "categoryId" TEXT NOT NULL,
  "subjectId" TEXT,
  "instructorId" TEXT,
  "level" "CourseLevel" NOT NULL,
  "classNumber" INTEGER,
  "pricePaisa" INTEGER NOT NULL DEFAULT 0,
  "discountPaisa" INTEGER,
  "discountEndsAt" TIMESTAMP(3),
  "currency" TEXT NOT NULL DEFAULT 'BDT',
  "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
  "enrollmentLimit" INTEGER,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "hasCertificate" BOOLEAN NOT NULL DEFAULT false,
  "durationMinutes" INTEGER NOT NULL DEFAULT 0,
  "thumbnailSeed" INTEGER NOT NULL DEFAULT 1,
  "language" TEXT NOT NULL DEFAULT 'bn',
  "createdBy" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");
CREATE INDEX "Course_status_level_isFeatured_idx" ON "Course"("status", "level", "isFeatured");
CREATE INDEX "Course_categoryId_idx" ON "Course"("categoryId");
CREATE INDEX "Course_subjectId_idx" ON "Course"("subjectId");

CREATE TABLE "CourseModule" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "courseId" TEXT NOT NULL,
  "titleBn" TEXT NOT NULL,
  "titleEn" TEXT,
  "description" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourseModule_courseId_order_key" ON "CourseModule"("courseId", "order");
CREATE INDEX "CourseModule_courseId_idx" ON "CourseModule"("courseId");

CREATE TABLE "VideoAsset" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "provider" "VideoProvider" NOT NULL DEFAULT 'LOCAL_HLS',
  "storagePath" TEXT NOT NULL,
  "posterPath" TEXT,
  "durationSeconds" INTEGER NOT NULL DEFAULT 0,
  "sizeBytes" INTEGER NOT NULL DEFAULT 0,
  "status" "AssetStatus" NOT NULL DEFAULT 'PROCESSING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VideoAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VideoAsset_status_idx" ON "VideoAsset"("status");

CREATE TABLE "DocumentAsset" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "storagePath" TEXT NOT NULL,
  "pageCount" INTEGER NOT NULL DEFAULT 0,
  "sizeBytes" INTEGER NOT NULL DEFAULT 0,
  "status" "AssetStatus" NOT NULL DEFAULT 'READY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DocumentAsset_status_idx" ON "DocumentAsset"("status");

CREATE TABLE "Lesson" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "moduleId" TEXT NOT NULL,
  "titleBn" TEXT NOT NULL,
  "titleEn" TEXT,
  "type" "LessonType" NOT NULL DEFAULT 'VIDEO',
  "contentBn" TEXT,
  "contentEn" TEXT,
  "videoAssetId" TEXT,
  "documentAssetId" TEXT,
  "durationSeconds" INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isPreview" BOOLEAN NOT NULL DEFAULT false,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Lesson_moduleId_order_key" ON "Lesson"("moduleId", "order");
CREATE UNIQUE INDEX "Lesson_videoAssetId_key" ON "Lesson"("videoAssetId");
CREATE UNIQUE INDEX "Lesson_documentAssetId_key" ON "Lesson"("documentAssetId");
CREATE INDEX "Lesson_moduleId_idx" ON "Lesson"("moduleId");

-- Enrollment & payments -----------------------------------------------------

CREATE TABLE "Enrollment" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
  "accessExpiresAt" TIMESTAMP(3),
  "grantedBy" TEXT,
  "source" "EnrollmentSource" NOT NULL DEFAULT 'PAYMENT',
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Enrollment_userId_courseId_key" ON "Enrollment"("userId", "courseId");
CREATE INDEX "Enrollment_courseId_status_idx" ON "Enrollment"("courseId", "status");
CREATE INDEX "Enrollment_userId_status_idx" ON "Enrollment"("userId", "status");

CREATE TABLE "Coupon" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "code" TEXT NOT NULL,
  "type" "CouponType" NOT NULL,
  "value" INTEGER NOT NULL,
  "minAmountPaisa" INTEGER NOT NULL DEFAULT 0,
  "courseId" TEXT,
  "maxRedemptions" INTEGER,
  "redeemedCount" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_isActive_endsAt_idx" ON "Coupon"("isActive", "endsAt");

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "enrollmentId" TEXT,
  "amountPaisa" INTEGER NOT NULL,
  "discountPaisa" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'BDT',
  "method" "PaymentMethod" NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
  "gatewayRef" TEXT,
  "gatewayPayload" JSONB,
  "senderNumber" TEXT,
  "manualTxnId" TEXT,
  "note" TEXT,
  "couponId" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "verifiedBy" TEXT,
  "refundedAt" TIMESTAMP(3),
  "refundAmountPaisa" INTEGER,
  "invoiceNo" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Payment_invoiceNo_key" ON "Payment"("invoiceNo");
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");
CREATE INDEX "Payment_courseId_idx" ON "Payment"("courseId");

CREATE TABLE "PaymentEvent" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "paymentId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB,
  "signatureValid" BOOLEAN,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PaymentEvent_paymentId_idx" ON "PaymentEvent"("paymentId");

CREATE TABLE "CouponRedemption" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "couponId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "paymentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CouponRedemption_couponId_userId_paymentId_key" ON "CouponRedemption"("couponId", "userId", "paymentId");
CREATE UNIQUE INDEX "CouponRedemption_paymentId_key" ON "CouponRedemption"("paymentId");
CREATE INDEX "CouponRedemption_couponId_userId_idx" ON "CouponRedemption"("couponId", "userId");

-- Learning ------------------------------------------------------------------

CREATE TABLE "LessonProgress" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "positionSeconds" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LessonProgress_userId_lessonId_key" ON "LessonProgress"("userId", "lessonId");
CREATE INDEX "LessonProgress_enrollmentId_lastViewedAt_idx" ON "LessonProgress"("enrollmentId", "lastViewedAt");

CREATE TABLE "PlaybackSession" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  "deviceId" TEXT,
  "appSessionId" TEXT,
  "tokenFingerprint" TEXT NOT NULL,
  "ip" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedReason" TEXT,
  CONSTRAINT "PlaybackSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PlaybackSession_userId_revokedAt_lastHeartbeatAt_idx" ON "PlaybackSession"("userId", "revokedAt", "lastHeartbeatAt");
CREATE INDEX "PlaybackSession_lessonId_idx" ON "PlaybackSession"("lessonId");

CREATE TABLE "AssetAccessLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "assetType" "AssetType" NOT NULL,
  "assetId" TEXT NOT NULL,
  "videoAssetId" TEXT,
  "documentAssetId" TEXT,
  "action" TEXT NOT NULL,
  "ip" TEXT,
  "appSessionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssetAccessLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AssetAccessLog_userId_createdAt_idx" ON "AssetAccessLog"("userId", "createdAt");
CREATE INDEX "AssetAccessLog_assetType_assetId_idx" ON "AssetAccessLog"("assetType", "assetId");

-- Exams ---------------------------------------------------------------------

CREATE TABLE "Exam" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "courseId" TEXT,
  "moduleId" TEXT,
  "subjectId" TEXT,
  "titleBn" TEXT NOT NULL,
  "titleEn" TEXT,
  "description" TEXT,
  "type" "ExamType" NOT NULL DEFAULT 'MCQ_PRACTICE',
  "chapterBn" TEXT,
  "durationMinutes" INTEGER NOT NULL DEFAULT 15,
  "totalMarks" INTEGER NOT NULL DEFAULT 0,
  "passMarks" INTEGER NOT NULL DEFAULT 0,
  "negativePerWrong" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "shuffleQuestions" BOOLEAN NOT NULL DEFAULT true,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "isPublished" BOOLEAN NOT NULL DEFAULT false,
  "availableFrom" TIMESTAMP(3),
  "availableTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Exam_courseId_isPublished_idx" ON "Exam"("courseId", "isPublished");
CREATE INDEX "Exam_subjectId_idx" ON "Exam"("subjectId");

CREATE TABLE "Question" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "subjectId" TEXT,
  "level" "CourseLevel" NOT NULL,
  "chapterBn" TEXT,
  "stemBn" TEXT NOT NULL,
  "stemEn" TEXT,
  "optionsBn" JSONB NOT NULL,
  "correctIndex" INTEGER NOT NULL,
  "explanationBn" TEXT,
  "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'MEDIUM',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Question_subjectId_level_chapterBn_idx" ON "Question"("subjectId", "level", "chapterBn");
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");

CREATE TABLE "ExamQuestion" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "examId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "marks" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExamQuestion_examId_questionId_key" ON "ExamQuestion"("examId", "questionId");
CREATE INDEX "ExamQuestion_examId_order_idx" ON "ExamQuestion"("examId", "order");

CREATE TABLE "ExamAttempt" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "examId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "score" DOUBLE PRECISION,
  "totalMarks" INTEGER NOT NULL,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "wrongCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "answers" JSONB NOT NULL,
  CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExamAttempt_examId_userId_attemptNumber_key" ON "ExamAttempt"("examId", "userId", "attemptNumber");
CREATE INDEX "ExamAttempt_userId_submittedAt_idx" ON "ExamAttempt"("userId", "submittedAt");

CREATE TABLE "Certificate" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "serial" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "issuedBy" TEXT,
  CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Certificate_serial_key" ON "Certificate"("serial");
CREATE INDEX "Certificate_enrollmentId_idx" ON "Certificate"("enrollmentId");

-- Notifications, content, settings, audit ------------------------------------

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "titleBn" TEXT NOT NULL,
  "bodyBn" TEXT NOT NULL,
  "linkUrl" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

CREATE TABLE "Announcement" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "courseId" TEXT,
  "titleBn" TEXT NOT NULL,
  "bodyBn" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Announcement_courseId_publishedAt_idx" ON "Announcement"("courseId", "publishedAt");

CREATE TABLE "Testimonial" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "nameBn" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "roleBn" TEXT NOT NULL,
  "quoteBn" TEXT NOT NULL,
  "rating" INTEGER NOT NULL DEFAULT 5,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Faq" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "questionBn" TEXT NOT NULL,
  "answerBn" TEXT NOT NULL,
  "questionEn" TEXT,
  "answerEn" TEXT,
  "category" TEXT NOT NULL DEFAULT 'general',
  "order" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Banner" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "placement" TEXT NOT NULL DEFAULT 'HOME_HERO',
  "titleBn" TEXT NOT NULL,
  "subtitleBn" TEXT,
  "ctaLabelBn" TEXT,
  "ctaHref" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactMessage" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "ContactStatus" NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ContactMessage_status_createdAt_idx" ON "ContactMessage"("status", "createdAt");

CREATE TABLE "SiteSettings" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "actorId" TEXT,
  "actorRole" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "metadata" JSONB,
  "ip" TEXT,
  "prevHash" TEXT,
  "hash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

CREATE TABLE "Favorite" (
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId", "courseId")
);

-- Foreign keys ---------------------------------------------------------------

ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceTrust" ADD CONSTRAINT "DeviceTrust_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "DeviceTrust"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VerificationCode" ADD CONSTRAINT "VerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CourseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CourseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "VideoAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_documentAssetId_fkey" FOREIGN KEY ("documentAssetId") REFERENCES "DocumentAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaybackSession" ADD CONSTRAINT "PlaybackSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlaybackSession" ADD CONSTRAINT "PlaybackSession_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "DeviceTrust"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetAccessLog" ADD CONSTRAINT "AssetAccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetAccessLog" ADD CONSTRAINT "AssetAccessLog_videoAssetId_fkey" FOREIGN KEY ("videoAssetId") REFERENCES "VideoAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetAccessLog" ADD CONSTRAINT "AssetAccessLog_documentAssetId_fkey" FOREIGN KEY ("documentAssetId") REFERENCES "DocumentAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
