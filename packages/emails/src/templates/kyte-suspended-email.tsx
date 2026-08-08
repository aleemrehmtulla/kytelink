import * as React from "react";
import { Heading, Link, Text } from "@react-email/components";
import { EmailShell } from "./email-shell";
import { renderEmail, type RenderedEmail } from "../render";
import { emailHeadingStyle, emailTextStyle, EMAIL_MUTED } from "../theme";

export interface KyteSuspendedEmailProps {
  kyteUsername: string;
  reason: string;
  appealUrl: string;
}

export function kyteSuspendedSubject(kyteUsername: string): string {
  return `Your kyte @${kyteUsername} has been suspended`;
}

function KyteSuspendedEmail({ kyteUsername, reason, appealUrl }: KyteSuspendedEmailProps) {
  return (
    <EmailShell preview={`@${kyteUsername} has been suspended`}>
      <Heading as="h1" style={emailHeadingStyle}>
        @{kyteUsername} has been suspended
      </Heading>
      <Text style={emailTextStyle}>
        This kyte is read-only while it is suspended. You can still sign in and see everything on
        it — editing and publishing are paused.
      </Text>
      <Text style={emailTextStyle}>
        <strong>Reason on file:</strong> {reason}
      </Text>
      <Text style={{ color: EMAIL_MUTED, fontSize: "15px", lineHeight: "24px", margin: 0 }}>
        Think this is a mistake? <Link href={appealUrl}>Appeal it here</Link> — appeals are read by
        a person.
      </Text>
    </EmailShell>
  );
}

export function renderKyteSuspendedEmail(
  props: KyteSuspendedEmailProps,
): Promise<RenderedEmail> {
  return renderEmail(<KyteSuspendedEmail {...props} />);
}
