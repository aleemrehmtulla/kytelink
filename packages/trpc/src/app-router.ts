import { router } from "./trpc";
import { orgRouter } from "./routers/org";
import { kyteRouter } from "./routers/kyte";
import { scheduleRouter } from "./routers/schedule";
import { previewRouter } from "./routers/preview";
import { importRouter } from "./routers/import";
import { teamRouter } from "./routers/team";
import { invitesRouter } from "./routers/invites";
import { accountRouter } from "./routers/account";
import { assetsRouter } from "./routers/assets";
import { analyticsRouter } from "./routers/analytics";
import { domainsRouter } from "./routers/domains";
import { adminRouter } from "./routers/admin";

export const appRouter = router({
  org: orgRouter,
  kyte: kyteRouter,
  schedule: scheduleRouter,
  preview: previewRouter,
  import: importRouter,
  team: teamRouter,
  invites: invitesRouter,
  account: accountRouter,
  assets: assetsRouter,
  analytics: analyticsRouter,
  domains: domainsRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
