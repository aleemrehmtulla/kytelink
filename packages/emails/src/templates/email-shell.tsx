import * as React from "react";
import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { getCdnUrl } from "@kytelink/cdn";
import {
  BRAND_TAGLINE,
  EMAIL_BORDER,
  EMAIL_FONT_FAMILY,
  EMAIL_MUTED,
  EMAIL_SURFACE,
  EMAIL_TEXT,
} from "../theme";

export interface EmailShellProps {
  preview: string;
  children: ReactNode;
}

const bodyStyle = {
  backgroundColor: EMAIL_SURFACE,
  fontFamily: EMAIL_FONT_FAMILY,
  color: EMAIL_TEXT,
  margin: 0,
  padding: "24px 12px",
};

const containerStyle = {
  backgroundColor: "#FFFFFF",
  border: `1px solid ${EMAIL_BORDER}`,
  borderRadius: "12px",
  maxWidth: "480px",
  margin: "0 auto",
  padding: "32px",
};

const footerStyle = {
  color: EMAIL_MUTED,
  fontSize: "13px",
  lineHeight: "20px",
  margin: 0,
};

export function EmailShell({ preview, children }: EmailShellProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section>
            <Img
              src={getCdnUrl("logos/icon.svg")}
              alt="Kytelink"
              width={32}
              height={32}
              style={{ display: "block" }}
            />
          </Section>
          <Section style={{ paddingTop: "20px" }}>{children}</Section>
          <Hr style={{ borderColor: EMAIL_BORDER, margin: "28px 0 16px" }} />
          <Text style={footerStyle}>Kytelink · {BRAND_TAGLINE}</Text>
        </Container>
      </Body>
    </Html>
  );
}
