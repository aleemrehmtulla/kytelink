import { GITHUB_REPO_URL } from "./site";
import { LEGAL_CONTACT_EMAIL, SUPPORT_EMAIL } from "../lib/legal/contact";

export const ABOUT_HEADLINE = "A link-in-bio that costs nothing, hides nothing.";

export const ABOUT_PARAGRAPHS = [
  "Kytelink is a free, open-source link-in-bio platform: one page that holds every link, social icon, and theme you want to share. Custom domains, analytics, scheduled publishing, and team workspaces are all included, and none of it sits behind a paid tier — there isn't one.",
  "It started small. Aleem wanted @aleem as a handle, Linktree had given it away, and building an entire platform seemed like a reasonable response. That overkill solution grew into a full product, then into a ground-up rewrite with publish-time phishing review, cookie-free analytics, and an editor we're genuinely proud of.",
  "The whole stack is MIT-licensed and public on GitHub. You can read every line, self-host your own instance with the same features as the hosted one, and export your data as JSON whenever you like. Hosting is paid for out of pocket — no ads, no trackers, no selling data, no investors to answer to.",
  "Every page published on kytelink.com is reviewed before it goes live, every suspension is decided by a person, and our anti-phishing statement explains the whole system in public. Trust is easier to keep when there's nothing to hide.",
];

export const CONTACT_HEADLINE = "Talk to a person, not a portal.";
export const CONTACT_INTRO =
  "Kytelink is a small operation, which means your email lands with someone who can actually fix things. Pick the channel that fits and we'll take it from there.";

export const REPORT_HEADLINE =
  "Seen a Kytelink impersonating a company or running a scam?";
export const REPORT_INTRO = "Tell us where, and why. We review every report.";

export const APPEAL_HEADLINE = "Think we got it wrong?";
export const APPEAL_INTRO =
  "Tell us what was suspended and why it shouldn't have been. A person reads every appeal, and nothing is deleted while we look.";

export interface ContactChannel {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}

export const CONTACT_CHANNELS: ContactChannel[] = [
  {
    title: "Support",
    description:
      "Questions about your account, your page, custom domains, or anything not working the way it should. A human reads every email.",
    href: `mailto:${SUPPORT_EMAIL}`,
    linkLabel: SUPPORT_EMAIL,
  },
  {
    title: "Privacy & legal",
    description:
      "Data export and deletion requests, privacy questions, and legal correspondence — everything covered by our privacy policy and terms.",
    href: `mailto:${LEGAL_CONTACT_EMAIL}`,
    linkLabel: LEGAL_CONTACT_EMAIL,
  },
  {
    title: "Report abuse",
    description:
      "Found a kytelink.com page phishing or impersonating a brand? Report it and the moderation pipeline takes it from there.",
    href: "/report",
    linkLabel: "kytelink.com/report",
  },
  {
    title: "Appeal a suspension",
    description:
      "If your page was suspended and you believe the call was wrong, appeal it — a person reviews every appeal.",
    href: "/appeal",
    linkLabel: "kytelink.com/appeal",
  },
  {
    title: "Bugs & contributions",
    description:
      "The entire codebase is open source. File bugs, request features, or send a pull request on GitHub.",
    href: `${GITHUB_REPO_URL}/issues`,
    linkLabel: "GitHub issues",
  },
];
