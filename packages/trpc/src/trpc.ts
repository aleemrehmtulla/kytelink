import { initTRPC, TRPCError } from "@trpc/server";
import type { AuthedTrpcContext, TrpcContext } from "./context";
import { appCodeOf } from "./errors";

const t = initTRPC.context<TrpcContext>().create({
  errorFormatter({ shape, error }) {
    // An INTERNAL_SERVER_ERROR message is whatever the underlying failure
    // threw (driver errors, SQL, stack fragments) — it must never reach the
    // browser. The full error still lands in the server log via onError.
    const internal = error.code === "INTERNAL_SERVER_ERROR";
    const formatted = {
      ...shape,
      message: internal ? "Something went wrong. Please try again." : shape.message,
      data: {
        ...shape.data,
        appCode: appCodeOf(error) ?? appCodeOf(error.cause),
      },
    };
    if (internal) delete formatted.data.stack;
    return formatted;
  },
});

export const router = t.router;
export const middleware = t.middleware;
const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

const requireAuth = middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
  }
  return next({
    ctx: { ...ctx, session: ctx.session, user: ctx.user } satisfies AuthedTrpcContext,
  });
});

const requireKyteAccess = middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
  }
  return next({
    ctx: { ...ctx, session: ctx.session, user: ctx.user } satisfies AuthedTrpcContext,
  });
});

const requireAdmin = middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
  }
  if (!ctx.session.isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
  }
  // Belt and braces: an impersonated context already carries isAdmin=false, so
  // this can only fire if the swap ever regresses. Admin powers must not be
  // reachable through a session that is pretending to be someone else.
  if (ctx.impersonation) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
  }
  return next({
    ctx: { ...ctx, session: ctx.session, user: ctx.user } satisfies AuthedTrpcContext,
  });
});

export const authedProcedure = publicProcedure.use(requireAuth);
export const kyteProcedure = publicProcedure.use(requireKyteAccess);
export const adminProcedure = publicProcedure.use(requireAdmin);
