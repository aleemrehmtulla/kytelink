-- better-auth 1.x's Prisma adapter requires a Boolean emailVerified on User
-- (a recorded deviation from 03-database.md, which specified DateTime?).
ALTER TABLE "User" DROP COLUMN "emailVerified";
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
