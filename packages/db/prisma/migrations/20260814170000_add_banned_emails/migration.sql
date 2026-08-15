-- A ban deletes the User row outright, so the denylist has to live outside it:
-- this table is what stops a banned email from simply signing up again.
CREATE TABLE "BannedEmail" (
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "bannedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BannedEmail_pkey" PRIMARY KEY ("email")
);
