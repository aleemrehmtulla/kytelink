import * as React from "react";
import { Heading, Text } from "@react-email/components";
import { EmailShell } from "./email-shell";
import { renderEmail, type RenderedEmail } from "../render";
import { emailHeadingStyle, emailTextStyle, EMAIL_MUTED } from "../theme";

export interface AppealDecisionEmailProps {
  handle: string;
  approved: boolean;
  note?: string;
}

export function appealDecisionSubject(handle: string): string {
  return `Your appeal for ${handle} has been reviewed`;
}

function AppealDecisionEmail({ handle, approved, note }: AppealDecisionEmailProps) {
  return (
    <EmailShell preview={`Your appeal for ${handle} has been reviewed`}>
      <Heading as="h1" style={emailHeadingStyle}>
        {approved ? "Your appeal was accepted" : "Your appeal has been reviewed"}
      </Heading>
      <Text style={emailTextStyle}>
        {approved
          ? `A person reviewed your appeal for ${handle} and accepted it — everything is being put back. You'll get a separate note once the page is live again.`
          : `A person reviewed your appeal for ${handle} and the suspension stands.`}
      </Text>
      {note ? <Text style={emailTextStyle}>From the reviewer: “{note}”</Text> : null}
      <Text style={{ color: EMAIL_MUTED, fontSize: "15px", lineHeight: "24px", margin: 0 }}>
        {approved
          ? "Sorry for the interruption — thanks for flagging it."
          : "Every appeal is read by a human, not a machine. If the page's content changes, it is reviewed fresh the next time it's published."}
      </Text>
    </EmailShell>
  );
}

export function renderAppealDecisionEmail(props: AppealDecisionEmailProps): Promise<RenderedEmail> {
  return renderEmail(<AppealDecisionEmail {...props} />);
}
