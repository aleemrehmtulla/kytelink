import * as React from "react";
import { Heading, Link, Text } from "@react-email/components";
import { EmailShell } from "./email-shell";
import { renderEmail, type RenderedEmail } from "../render";
import { emailHeadingStyle, emailTextStyle, EMAIL_MUTED } from "../theme";

export interface KyteRestoredEmailProps {
  kyteUsername: string;
  profileUrl: string;
}

export function kyteRestoredSubject(kyteUsername: string): string {
  return `Your kyte @${kyteUsername} is back online`;
}

function KyteRestoredEmail({ kyteUsername, profileUrl }: KyteRestoredEmailProps) {
  return (
    <EmailShell preview={`@${kyteUsername} has been restored`}>
      <Heading as="h1" style={emailHeadingStyle}>
        @{kyteUsername} is back online
      </Heading>
      <Text style={emailTextStyle}>
        Your kyte was re-reviewed and the suspension has been lifted. The page is live again with
        all of its content, links, and analytics intact — there is nothing you need to do.
      </Text>
      <Text style={emailTextStyle}>
        <Link href={profileUrl}>See your page</Link>
      </Text>
      <Text style={{ color: EMAIL_MUTED, fontSize: "15px", lineHeight: "24px", margin: 0 }}>
        Sorry for the interruption — thanks for being on Kytelink.
      </Text>
    </EmailShell>
  );
}

export function renderKyteRestoredEmail(props: KyteRestoredEmailProps): Promise<RenderedEmail> {
  return renderEmail(<KyteRestoredEmail {...props} />);
}
