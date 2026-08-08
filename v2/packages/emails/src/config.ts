export type EmailProviderKind = "console" | "smtp" | "resend";

export const DEFAULT_EMAIL_FROM = "Kytelink <auth@mail.kytelink.com>";

interface SmtpConfig {
  host: string;
  port: number;
  user?: string;
  password?: string;
}

export interface EmailConfig {
  provider: EmailProviderKind;
  from: string;
  resendApiKey?: string;
  smtp?: SmtpConfig;
}

export interface EmailEnv {
  EMAIL_PROVIDER?: string;
  EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
}

function present(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// Mirrors computeCapabilities().emailDelivery (env.ts): a configured provider
// with no working credentials degrades to console so OTPs/invites still print
// to the logs (and mailpit) instead of silently failing.
export function readEmailConfig(env: EmailEnv = process.env): EmailConfig {
  const from = present(env.EMAIL_FROM) ? env.EMAIL_FROM : DEFAULT_EMAIL_FROM;
  const requested = env.EMAIL_PROVIDER as EmailProviderKind | undefined;

  if (requested === "resend" && present(env.RESEND_API_KEY)) {
    return { provider: "resend", from, resendApiKey: env.RESEND_API_KEY };
  }

  if (requested === "smtp" && present(env.SMTP_HOST)) {
    return {
      provider: "smtp",
      from,
      smtp: {
        host: env.SMTP_HOST,
        port: present(env.SMTP_PORT) ? Number(env.SMTP_PORT) : 587,
        user: present(env.SMTP_USER) ? env.SMTP_USER : undefined,
        password: present(env.SMTP_PASSWORD) ? env.SMTP_PASSWORD : undefined,
      },
    };
  }

  return { provider: "console", from };
}
