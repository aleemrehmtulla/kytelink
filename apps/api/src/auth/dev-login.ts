import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getConfig } from "../config";
import { getAuth } from "./auth";

const devLoginInput = z.object({ email: z.email() });

/**
 * AGENT_MODE-only shortcut (doc 24): sends the fixed 000000 OTP for a
 * @kytelink.dev address and immediately verifies it through the real
 * better-auth email-otp flow, forwarding the signed session cookie. Mounted
 * before the /auth/* catch-all. Refused outside agent mode.
 */
export function registerDevLogin(app: FastifyInstance): void {
  app.post("/auth/dev-login", async (req, reply) => {
    const config = getConfig();
    if (!config.agentMode) {
      await reply.status(404).send({ error: "NOT_FOUND" });
      return;
    }
    const parsed = devLoginInput.safeParse(req.body);
    if (!parsed.success) {
      await reply.status(400).send({ error: "BAD_REQUEST", message: "email is required" });
      return;
    }
    const email = parsed.data.email.trim().toLowerCase();
    if (!email.endsWith("@kytelink.dev")) {
      await reply.status(403).send({ error: "FORBIDDEN", message: "dev-login is @kytelink.dev only" });
      return;
    }

    const auth = getAuth();
    await auth.api.sendVerificationOTP({ body: { email, type: "sign-in" } });
    const response = await auth.api.signInEmailOTP({
      body: { email, otp: "000000" },
      asResponse: true,
    });

    for (const cookie of response.headers.getSetCookie()) {
      reply.header("set-cookie", cookie);
    }
    const body = (await response.json().catch(() => ({}))) as { user?: { id?: string } };
    await reply.status(response.status).send({ ok: response.ok, userId: body.user?.id ?? null });
  });
}
