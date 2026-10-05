-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'AUTHOR', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE', 'PHONE');
CREATE TYPE "ContentType" AS ENUM ('COMIC', 'NOVEL', 'SHORT_STORY', 'AUDIOBOOK');
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED');
CREATE TYPE "ReleaseStatus" AS ENUM ('ONGOING', 'COMPLETED');
CREATE TYPE "LibraryShelf" AS ENUM ('CURRENTLY_READING', 'COMPLETED', 'SAVED', 'PURCHASED');
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED');
CREATE TYPE "PaymentProvider" AS ENUM ('RAZORPAY', 'STRIPE', 'MOCK_GATEWAY');
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'MONTHLY_PREMIUM', 'YEARLY_PREMIUM');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PAST_DUE');
CREATE TYPE "EntitlementSource" AS ENUM ('PURCHASE', 'SUBSCRIPTION', 'ADMIN_GRANT');
CREATE TYPE "NotificationType" AS ENUM ('NEW_CHAPTER', 'NEW_AUDIOBOOK', 'NEW_RELEASE', 'PAYMENT_SUCCESS', 'PAYMENT_FAILURE', 'SUBSCRIPTION_EXPIRY', 'SECURITY_ALERT', 'NEW_LOGIN', 'PASSWORD_CHANGE');

-- CreateTable User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "avatarUrl" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable UserIdentity
CREATE TABLE "UserIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "identityData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable Session
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable PrivacySettings
CREATE TABLE "PrivacySettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isProfilePublic" BOOLEAN NOT NULL DEFAULT false,
    "showReadingActivity" BOOLEAN NOT NULL DEFAULT false,
    "showReviews" BOOLEAN NOT NULL DEFAULT true,
    "allowPersonalization" BOOLEAN NOT NULL DEFAULT true,
    "allowAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "allowMarketing" BOOLEAN NOT NULL DEFAULT false,
    "allowPushAlerts" BOOLEAN NOT NULL DEFAULT true,
    "allowPersonalizedAds" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrivacySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable PasswordResetToken
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable EmailVerificationToken
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable PhoneOtpCode
CREATE TABLE "PhoneOtpCode" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhoneOtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable Author
CREATE TABLE "Author" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "website" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Author_pkey" PRIMARY KEY ("id")
);

-- CreateTable AuthorFollower
CREATE TABLE "AuthorFollower" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthorFollower_pkey" PRIMARY KEY ("id")
);

-- CreateTable Genre
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable Content
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "authorId" TEXT NOT NULL,
    "artistName" TEXT,
    "coverUrl" TEXT NOT NULL,
    "bannerUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "releaseStatus" "ReleaseStatus" NOT NULL DEFAULT 'ONGOING',
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT NOT NULL DEFAULT 'en',
    "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable ContentGenre
CREATE TABLE "ContentGenre" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,
    CONSTRAINT "ContentGenre_pkey" PRIMARY KEY ("id")
);

-- CreateTable Chapter
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "chapterNumber" DOUBLE PRECISION NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable ComicPage
CREATE TABLE "ComicPage" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComicPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable NovelChapterContent
CREATE TABLE "NovelChapterContent" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "textContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NovelChapterContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable Audiobook
CREATE TABLE "Audiobook" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "narrator" TEXT NOT NULL,
    "totalDurationSeconds" INTEGER NOT NULL DEFAULT 0,
    "sampleAudioUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Audiobook_pkey" PRIMARY KEY ("id")
);

-- CreateTable AudioChapter
CREATE TABLE "AudioChapter" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "bitRate" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AudioChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable Library
CREATE TABLE "Library" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "shelf" "LibraryShelf" NOT NULL DEFAULT 'CURRENTLY_READING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Library_pkey" PRIMARY KEY ("id")
);

-- CreateTable ReadingProgress
CREATE TABLE "ReadingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL DEFAULT 1,
    "scrollPosition" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentCompleted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable ListeningProgress
CREATE TABLE "ListeningProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "positionSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentCompleted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastListenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ListeningProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable Bookmark
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "audioPositionSeconds" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable Review
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "isSpoiler" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable ReviewHelpfulVote
CREATE TABLE "ReviewHelpfulVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewHelpfulVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable Order
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
    "providerOrderId" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable Payment
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "providerPaymentId" TEXT NOT NULL,
    "providerSignature" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "rawPayload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable Subscription
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "providerSubscriptionId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable Entitlement
CREATE TABLE "Entitlement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "chapterId" TEXT,
    "source" "EntitlementSource" NOT NULL DEFAULT 'PURCHASE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable Refund
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "providerRefundId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable Notification
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "linkUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable NotificationPreferences
CREATE TABLE "NotificationPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "inAppNotifications" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
    "securityAlerts" BOOLEAN NOT NULL DEFAULT true,
    "newReleaseAlerts" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- Unique constraints & Indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_phone_idx" ON "User"("phone");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_status_idx" ON "User"("status");

CREATE UNIQUE INDEX "UserIdentity_provider_providerUserId_key" ON "UserIdentity"("provider", "providerUserId");
CREATE INDEX "UserIdentity_userId_idx" ON "UserIdentity"("userId");

CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_sessionToken_idx" ON "Session"("sessionToken");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE UNIQUE INDEX "PrivacySettings_userId_key" ON "PrivacySettings"("userId");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

CREATE INDEX "PhoneOtpCode_phone_idx" ON "PhoneOtpCode"("phone");
CREATE INDEX "PhoneOtpCode_expiresAt_idx" ON "PhoneOtpCode"("expiresAt");

CREATE UNIQUE INDEX "Author_slug_key" ON "Author"("slug");
CREATE UNIQUE INDEX "Author_userId_key" ON "Author"("userId");
CREATE INDEX "Author_slug_idx" ON "Author"("slug");
CREATE INDEX "Author_name_idx" ON "Author"("name");

CREATE UNIQUE INDEX "AuthorFollower_userId_authorId_key" ON "AuthorFollower"("userId", "authorId");
CREATE INDEX "AuthorFollower_userId_idx" ON "AuthorFollower"("userId");
CREATE INDEX "AuthorFollower_authorId_idx" ON "AuthorFollower"("authorId");

CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");
CREATE UNIQUE INDEX "Genre_slug_key" ON "Genre"("slug");
CREATE INDEX "Genre_slug_idx" ON "Genre"("slug");

CREATE UNIQUE INDEX "Content_slug_key" ON "Content"("slug");
CREATE INDEX "Content_slug_idx" ON "Content"("slug");
CREATE INDEX "Content_contentType_idx" ON "Content"("contentType");
CREATE INDEX "Content_status_idx" ON "Content"("status");
CREATE INDEX "Content_isPremium_idx" ON "Content"("isPremium");
CREATE INDEX "Content_ratingAverage_idx" ON "Content"("ratingAverage");
CREATE INDEX "Content_authorId_idx" ON "Content"("authorId");

CREATE UNIQUE INDEX "ContentGenre_contentId_genreId_key" ON "ContentGenre"("contentId", "genreId");
CREATE INDEX "ContentGenre_contentId_idx" ON "ContentGenre"("contentId");
CREATE INDEX "ContentGenre_genreId_idx" ON "ContentGenre"("genreId");

CREATE UNIQUE INDEX "Chapter_contentId_chapterNumber_key" ON "Chapter"("contentId", "chapterNumber");
CREATE UNIQUE INDEX "Chapter_contentId_slug_key" ON "Chapter"("contentId", "slug");
CREATE INDEX "Chapter_contentId_idx" ON "Chapter"("contentId");

CREATE UNIQUE INDEX "ComicPage_chapterId_pageNumber_key" ON "ComicPage"("chapterId", "pageNumber");
CREATE INDEX "ComicPage_chapterId_idx" ON "ComicPage"("chapterId");

CREATE UNIQUE INDEX "NovelChapterContent_chapterId_key" ON "NovelChapterContent"("chapterId");
CREATE UNIQUE INDEX "Audiobook_contentId_key" ON "Audiobook"("contentId");
CREATE UNIQUE INDEX "AudioChapter_chapterId_key" ON "AudioChapter"("chapterId");

CREATE UNIQUE INDEX "Library_userId_contentId_key" ON "Library"("userId", "contentId");
CREATE INDEX "Library_userId_shelf_idx" ON "Library"("userId", "shelf");

CREATE UNIQUE INDEX "ReadingProgress_userId_contentId_key" ON "ReadingProgress"("userId", "contentId");
CREATE INDEX "ReadingProgress_userId_idx" ON "ReadingProgress"("userId");
CREATE INDEX "ReadingProgress_contentId_idx" ON "ReadingProgress"("contentId");

CREATE UNIQUE INDEX "ListeningProgress_userId_contentId_key" ON "ListeningProgress"("userId", "contentId");
CREATE INDEX "ListeningProgress_userId_idx" ON "ListeningProgress"("userId");
CREATE INDEX "ListeningProgress_contentId_idx" ON "ListeningProgress"("contentId");

CREATE INDEX "Bookmark_userId_contentId_idx" ON "Bookmark"("userId", "contentId");

CREATE UNIQUE INDEX "Review_userId_contentId_key" ON "Review"("userId", "contentId");
CREATE INDEX "Review_contentId_idx" ON "Review"("contentId");
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

CREATE UNIQUE INDEX "ReviewHelpfulVote_userId_reviewId_key" ON "ReviewHelpfulVote"("userId", "reviewId");
CREATE INDEX "ReviewHelpfulVote_reviewId_idx" ON "ReviewHelpfulVote"("reviewId");

CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_status_idx" ON "Order"("status");

CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

CREATE UNIQUE INDEX "Entitlement_userId_contentId_chapterId_key" ON "Entitlement"("userId", "contentId", "chapterId");
CREATE INDEX "Entitlement_userId_idx" ON "Entitlement"("userId");
CREATE INDEX "Entitlement_contentId_idx" ON "Entitlement"("contentId");

CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE UNIQUE INDEX "NotificationPreferences_userId_key" ON "NotificationPreferences"("userId");

CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_resource_idx" ON "AuditLog"("resource");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Foreign key constraints
ALTER TABLE "UserIdentity" ADD CONSTRAINT "UserIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivacySettings" ADD CONSTRAINT "PrivacySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Author" ADD CONSTRAINT "Author_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuthorFollower" ADD CONSTRAINT "AuthorFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthorFollower" ADD CONSTRAINT "AuthorFollower_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Content" ADD CONSTRAINT "Content_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContentGenre" ADD CONSTRAINT "ContentGenre_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentGenre" ADD CONSTRAINT "ContentGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComicPage" ADD CONSTRAINT "ComicPage_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NovelChapterContent" ADD CONSTRAINT "NovelChapterContent_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Audiobook" ADD CONSTRAINT "Audiobook_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AudioChapter" ADD CONSTRAINT "AudioChapter_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Library" ADD CONSTRAINT "Library_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Library" ADD CONSTRAINT "Library_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListeningProgress" ADD CONSTRAINT "ListeningProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListeningProgress" ADD CONSTRAINT "ListeningProgress_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListeningProgress" ADD CONSTRAINT "ListeningProgress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewHelpfulVote" ADD CONSTRAINT "ReviewHelpfulVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewHelpfulVote" ADD CONSTRAINT "ReviewHelpfulVote_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationPreferences" ADD CONSTRAINT "NotificationPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
