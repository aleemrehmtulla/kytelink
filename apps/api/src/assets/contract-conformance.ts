import type { AppRouter as ContractAppRouter } from "@kytelink/trpc";
import { assetsRouter } from "./router";

/**
 * Compile-time proof that assetsRouter satisfies packages/trpc's frozen `assets`
 * contract, mirroring `_appRouterConformsToContract` in routers/index.ts.
 */
type ContractAssetsRouter = ContractAppRouter["assets"];
const _assetsRouterConformsToContract: ContractAssetsRouter = assetsRouter;
