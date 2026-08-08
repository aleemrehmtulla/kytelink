import { type AppRouter as ContractAppRouter, router } from "@kytelink/trpc";
import { orgRouter } from "./org";
import { kyteRouter } from "./kyte";
import { scheduleRouter } from "./schedule";
import { previewRouter } from "./preview";
import { importRouter } from "./import";
import { teamRouter } from "./team";
import { invitesRouter } from "./invites";
import { accountRouter } from "./account";
import { domainsRouter } from "./domains";
import { adminRouter } from "./admin";
import { analyticsRouter } from "../analytics";
import { assetsRouter } from "../assets";

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

type ApiAppRouter = typeof appRouter;

/**
 * Compile-time proof that the concrete, implemented router in apps/api conforms
 * to the frozen `AppRouter` contract in packages/trpc — so the shared client and
 * this server can never drift. Both assignments must typecheck.
 */
const _appRouterConformsToContract: ContractAppRouter = appRouter;
const _contractIsSatisfiedByAppRouter: ApiAppRouter = {} as ContractAppRouter;
