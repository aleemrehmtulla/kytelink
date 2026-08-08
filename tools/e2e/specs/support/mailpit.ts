import { MAILPIT_URL } from "./urls";

type MailpitMessage = { ID: string; To: { Address: string }[]; Subject: string; Created: string };

async function latestMessageTo(email: string): Promise<MailpitMessage | undefined> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=5`);
  if (!res.ok) return undefined;
  const body = (await res.json()) as { messages?: MailpitMessage[] };
  return body.messages?.[0];
}

async function messageBody(id: string): Promise<string> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`);
  if (!res.ok) throw new Error(`mailpit message fetch failed (${res.status})`);
  const body = (await res.json()) as { HTML?: string; Text?: string };
  return `${body.Text ?? ""}\n${body.HTML ?? ""}`;
}

export type OtpEmail = { otp: string; magicLink: string };

export async function waitForOtpEmail(email: string, { timeoutMs = 20000 } = {}): Promise<OtpEmail> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const msg = await latestMessageTo(email);
    if (msg) {
      const body = await messageBody(msg.ID);
      const otp = /Your Kytelink login code:\s*(\d{6})/.exec(msg.Subject)?.[1] ?? /\b(\d{6})\b/.exec(body)?.[1];
      const magicLink = /https?:\/\/[^\s"'<>]*\/auth\/verify[^\s"'<>]*/.exec(body)?.[0];
      if (otp && magicLink) return { otp, magicLink: magicLink.replace(/&amp;/g, "&") };
    }
    await new Promise((r) => setTimeout(r, 750));
  }
  throw new Error(`no OTP email for ${email} within ${timeoutMs}ms`);
}
