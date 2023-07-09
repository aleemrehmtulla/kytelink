-- CreateTable
CREATE TABLE "KyteDraft" (
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "username" TEXT,
    "name" TEXT,
    "description" TEXT,
    "pfp" TEXT,
    "theme" TEXT,
    "customFont" TEXT,
    "customColor" TEXT,
    "redirect" TEXT,
    "links" JSONB,
    "icons" JSONB,
    "vcf" JSONB,
    "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "KyteDraft_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "KyteProd" (
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "username" TEXT,
    "name" TEXT,
    "description" TEXT,
    "pfp" TEXT,
    "theme" TEXT,
    "customFont" TEXT,
    "customColor" TEXT,
    "redirect" TEXT,
    "links" JSONB,
    "icons" JSONB,
    "vcf" JSONB,
    "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "KyteProd_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "KyteDraft_email_key" ON "KyteDraft"("email");

-- CreateIndex
CREATE UNIQUE INDEX "KyteDraft_username_key" ON "KyteDraft"("username");

-- CreateIndex
CREATE UNIQUE INDEX "KyteProd_email_key" ON "KyteProd"("email");

-- CreateIndex
CREATE UNIQUE INDEX "KyteProd_username_key" ON "KyteProd"("username");

-- AddForeignKey
ALTER TABLE "KyteDraft" ADD CONSTRAINT "KyteDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KyteProd" ADD CONSTRAINT "KyteProd_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
