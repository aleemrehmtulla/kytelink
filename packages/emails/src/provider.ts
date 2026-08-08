import { type EmailConfig, type EmailProviderKind, readEmailConfig } from "./config";

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

interface SendEmailResult {
  provider: EmailProviderKind;
  delivered: boolean;
  id?: string;
}

export interface EmailProvider {
  readonly kind: EmailProviderKind;
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
}

type EmailSink = (undelivered: { to: string; subject: string }) => void;

let sink: EmailSink = ({ to, subject }) =>
  process.stdout.write(`email not sent (no provider configured) to=${to} subject=${subject}\n`);

/**
 * The console provider is what runs when no mail service is configured, so its
 * output is the only trace an email left. Hosts route it into their own logger
 * (apps/api does) rather than letting it land as an unformatted stdout line.
 */
export function setEmailSink(next: EmailSink): void {
  sink = next;
}

class ConsoleEmailProvider implements EmailProvider {
  readonly kind = "console" as const;

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    sink({ to: input.to, subject: input.subject });
    return { provider: "console", delivered: true };
  }
}

class ResendEmailProvider implements EmailProvider {
  readonly kind = "resend" as const;
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const { Resend } = await import("resend");
    const client = new Resend(this.apiKey);
    const { data, error } = await client.emails.send({
      from: input.from ?? this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (error) {
      throw new Error(`resend send failed: ${error.message}`);
    }
    return { provider: "resend", delivered: true, id: data?.id };
  }
}

class SmtpEmailProvider implements EmailProvider {
  readonly kind = "smtp" as const;
  constructor(
    private readonly config: NonNullable<EmailConfig["smtp"]>,
    private readonly from: string,
  ) {}

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      auth: this.config.user
        ? { user: this.config.user, pass: this.config.password }
        : undefined,
    });
    const info = await transport.sendMail({
      from: input.from ?? this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { provider: "smtp", delivered: true, id: info.messageId };
  }
}

export function createEmailProvider(config: EmailConfig): EmailProvider {
  switch (config.provider) {
    case "resend":
      return new ResendEmailProvider(config.resendApiKey ?? "", config.from);
    case "smtp":
      return new SmtpEmailProvider(
        config.smtp ?? { host: "localhost", port: 587 },
        config.from,
      );
    case "console":
      return new ConsoleEmailProvider();
  }
}

let singleton: EmailProvider | undefined;

export function getEmailProvider(env?: NodeJS.ProcessEnv): EmailProvider {
  singleton ??= createEmailProvider(readEmailConfig(env));
  return singleton;
}
