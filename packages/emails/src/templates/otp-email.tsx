import * as React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailShell } from "./email-shell";
import { renderEmail, type RenderedEmail } from "../render";
import {
  emailButtonStyle,
  emailCodeBoxStyle,
  emailHeadingStyle,
  EMAIL_MUTED,
} from "../theme";

export interface OtpEmailProps {
  otp: string;
  verifyUrl: string;
}

export function otpSubject(otp: string): string {
  return `Your Kytelink login code: ${otp}`;
}

function OtpEmail({ otp, verifyUrl }: OtpEmailProps) {
  return (
    <EmailShell preview={`Your Kytelink login code: ${otp}`}>
      <Heading as="h1" style={emailHeadingStyle}>
        Sign in to Kytelink
      </Heading>
      <Text style={{ color: EMAIL_MUTED, fontSize: "15px", lineHeight: "24px", margin: "0 0 16px" }}>
        Enter this code to finish signing in. It expires in 10 minutes.
      </Text>
      <Text style={emailCodeBoxStyle}>{otp}</Text>
      <Section style={{ margin: "0 0 8px" }}>
        <Button href={verifyUrl} style={emailButtonStyle}>
          Sign in now
        </Button>
      </Section>
      <Text style={{ color: EMAIL_MUTED, fontSize: "13px", lineHeight: "20px", marginTop: "20px" }}>
        If you didn&apos;t request this, you can ignore this email.
      </Text>
    </EmailShell>
  );
}

export function renderOtpEmail(props: OtpEmailProps): Promise<RenderedEmail> {
  return renderEmail(<OtpEmail {...props} />);
}