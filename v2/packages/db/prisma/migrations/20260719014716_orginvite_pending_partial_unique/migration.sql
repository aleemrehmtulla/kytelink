-- At most one PENDING invite per (org, email); resolved invites are unconstrained.
-- Not expressible in the Prisma schema (partial index), so it lives here.
CREATE UNIQUE INDEX "OrgInvite_orgId_email_pending_key"
  ON "OrgInvite" ("orgId", "email")
  WHERE "status" = 'PENDING';
