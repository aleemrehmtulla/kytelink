import { FeaturePageLayout } from "../../components/features-pages/feature-page-layout";
import { RolesSheetMock } from "../../components/features-pages/teams/roles-sheet-mock";
import { OrgPagesMock } from "../../components/features-pages/teams/org-pages-mock";
import { getFeature } from "../../consts/features";

const feature = getFeature("teams");

const bullets = [
  {
    title: "Five roles, clear limits",
    description: "Owner, Admin, Manager, Editor, Viewer — each can do exactly what you'd expect.",
  },
  {
    title: "Invite in seconds",
    description: "Send an invite by email. They accept, they're in — no seat juggling.",
  },
  {
    title: "One-click revoke",
    description: "Remove access instantly when someone leaves the team.",
  },
];

const sections = [
  {
    heading: "One organization, every page",
    paragraphs: [
      "A Kytelink organization holds as many link-in-bio pages as you need — one for the band, one for the tour, one per client — all managed from a single login. Switch between them in a click instead of juggling accounts and shared passwords.",
      "Everything in the organization is shared sensibly: members see the pages they're allowed to see, analytics roll up per page, and billing never enters the picture because there isn't any.",
    ],
  },
  {
    heading: "Five roles, real permissions",
    paragraphs: [
      "Owner, Admin, Manager, Editor, Viewer — each role maps to what people actually do. Editors can update the draft but can't publish. Managers can publish and manage domains but can't touch membership. Only the Owner can delete a page.",
      "The permission table on this page is generated from the exact rules the product enforces, so what you see here is what your team gets.",
    ],
  },
  {
    heading: "Invites without the seat math",
    paragraphs: [
      "Send an invite by email; when it's accepted, they're in with the role you chose. No per-seat pricing, no license pool to manage. When someone leaves, revoke access in one click and their session is gone.",
    ],
  },
];

const faqs = [
  {
    question: "Is Kytelink Teams a paid feature?",
    answer:
      "No. Organizations, roles, and invites are free, like the rest of Kytelink. There is no per-seat pricing.",
  },
  {
    question: "What roles does Kytelink support?",
    answer:
      "Five: Owner, Admin, Manager, Editor, and Viewer. Each has a clear scope — from full control down to read-only access to analytics.",
  },
  {
    question: "How many pages can one organization hold?",
    answer:
      "As many as you need. Agencies routinely run every client page from a single organization.",
  },
  {
    question: "How do invites work?",
    answer:
      "Enter an email and pick a role. The person gets an invite link, accepts, and shows up in your member list — revocable in one click.",
  },
  {
    question: "Can an editor accidentally publish?",
    answer:
      "No. Editors can only change the draft. Publishing requires the Manager role or above, so nothing goes live without the right hands on it.",
  },
  {
    question: "Can one person belong to more than one organization?",
    answer:
      "Yes. You can be a member of several organizations at once — your own plus a few clients' — and switch between them from a single login without signing out.",
  },
];

export function TeamsFeaturePage() {
  return (
    <FeaturePageLayout
      feature={feature}
      bullets={bullets}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="Run every kyte from one login."
      mockups={
        <>
          <RolesSheetMock />
          <OrgPagesMock />
        </>
      }
    />
  );
}

export default TeamsFeaturePage;
