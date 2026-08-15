import { randomInt } from "node:crypto";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins/email-otp";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { passkey } from "@better-auth/passkey";
import { getDb } from "@kytelink/db";
import { getEmailProvider, otpSubject, renderOtpEmail } from "@kytelink/emails";
import { getConfig } from "../config";
import { taggedLogger } from "../logger";
import { trackProductEvent } from "../seams/analytics-seam";
import { isCrossSubdomainAuth } from "./cookie-scope";

const log = taggedLogger("auth");
// Separated from our own auth lines so library chatter is obvious at a glance.
const authLibLog = taggedLogger("authlib");

function randomOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function buildAuth() {
  const config = getConfig();
  const crossSubdomain = isCrossSubdomainAuth(config);

  // WebAuthn RP ID is pinned to the apex domain (never the api. host where better-auth is
  // mounted) so credentials work on kytelink.com and survive an auth-host move. Local
  // dev/agent uses "localhost" — WebAuthn ignores ports (doc 05).
  const passkeyRpId = crossSubdomain ? "kytelink.com" : "localhost";
  const passkeyOrigins = Array.from(
    new Set(
      [config.webBaseUrl, config.landingOrigin, ...config.allowedOrigins, ...config.adminOrigins].filter(
        (origin): origin is string => Boolean(origin),
      ),
    ),
  );

  const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
  if (config.capabilities.oauthGoogle) {
    socialProviders.google = {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    };
  }
  if (config.capabilities.oauthGithub) {
    socialProviders.github = {
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    };
  }

  if (config.mockProviders && config.nodeEnv === "production") {
    throw new Error("AUTH_MOCK_PROVIDERS is refused in production.");
  }

  const otpPlugin = emailOTP({
    otpLength: 6,
    expiresIn: 600,
    allowedAttempts: 3,
    generateOTP: ({ email }) =>
      config.agentMode && email.trim().toLowerCase().endsWith("@kytelink.dev")
        ? "000000"
        : randomOtp(),
    async sendVerificationOTP({ email, otp }) {
      const verifyUrl = `${config.webBaseUrl}/auth/verify?email=${encodeURIComponent(email)}&otp=${otp}`;
      const rendered = await renderOtpEmail({ otp, verifyUrl });
      // The single most-copied line in local dev: the code, who it is for, and
      // a link that signs that person in without touching the login screen.
      if (config.nodeEnv !== "production") {
        log.info(`login code ${otp} for ${email} — expires in 10m, or open ${verifyUrl}`);
      }
      await getEmailProvider().sendEmail({
        to: email,
        subject: otpSubject(otp),
        html: rendered.html,
        text: rendered.text,
      });
    },
  });

  const mockPlugins = config.mockProviders
    ? [
        genericOAuth({
          config: [
            {
              providerId: "mock",
              clientId: "mock-client",
              clientSecret: "mock-secret",
              authorizationUrl: `${config.apiBaseUrl}/auth/mock/authorize`,
              tokenUrl: `${config.apiBaseUrl}/auth/mock/token`,
            },
          ],
        }),
      ]
    : [];

  const auth = betterAuth({
    database: prismaAdapter(getDb(), { provider: "postgresql" }),
    secret: process.env.AUTH_SECRET ?? "",
    baseURL: config.apiBaseUrl,
    basePath: "/auth",
    trustedOrigins: [...config.allowedOrigins, config.landingOrigin].filter(
      (origin): origin is string => Boolean(origin),
    ),
    emailAndPassword: { enabled: false },
    logger: {
      level: "warn",
      disableColors: true,
      log: (level, message, ...args) => {
        authLibLog[level]({ err: args.find((arg) => arg instanceof Error) }, message);
      },
    },
    socialProviders,
    account: { accountLinking: { enabled: true, trustedProviders: ["google", "github"] } },
    advanced: {
      cookiePrefix: config.agentMode ? "kyte_agent" : "kyte",
      ...(crossSubdomain
        ? { crossSubDomainCookies: { enabled: true, domain: ".kytelink.com" } }
        : {}),
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: crossSubdomain },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const email = user.email.trim().toLowerCase();
            if (!config.agentMode && email.endsWith("@kytelink.dev")) {
              throw new Error("@kytelink.dev signup is only allowed in agent mode.");
            }
            // A ban deletes the User row, so this denylist check is the only
            // thing that stops the same email from signing straight back up.
            const banned = await getDb().bannedEmail.findUnique({ where: { email } });
            if (banned) {
              throw new Error("This email address is banned from Kytelink.");
            }
            return { data: user };
          },
          // The row exists — this is the only place a signup is unambiguously
          // real. A client-side emission would miss every user who closes the
          // tab on the redirect back from an OAuth provider.
          after: (user) => {
            trackProductEvent({ event: "signup_completed", userId: user.id });
            return Promise.resolve();
          },
        },
      },
    },
    plugins: [
      otpPlugin,
      passkey({
        rpID: passkeyRpId,
        rpName: "Kytelink",
        origin: passkeyOrigins.length > 0 ? passkeyOrigins : null,
      }),
      ...mockPlugins,
    ],
  });

  log.debug(
    {
      oauthGoogle: config.capabilities.oauthGoogle,
      oauthGithub: config.capabilities.oauthGithub,
      mockProviders: config.mockProviders,
      passkeyRpId,
    },
    "auth ready — email codes, passkeys, and the enabled social providers",
  );
  return auth;
}

export type Auth = ReturnType<typeof buildAuth>;

let instance: Auth | undefined;

export function getAuth(): Auth {
  instance ??= buildAuth();
  return instance;
}
