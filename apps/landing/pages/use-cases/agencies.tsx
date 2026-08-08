import { UseCasePageLayout } from "../../components/use-cases/use-case-page-layout";
import { getUseCase } from "../../consts/use-cases";

const useCase = getUseCase("agencies");

const sections = [
  {
    heading: "Every client page, one dashboard",
    paragraphs: [
      "Running client link-in-bio pages through shared logins and password spreadsheets doesn't scale past the third client. A Kytelink organization holds every client page under one roof: switch between them in a click, see each page's analytics, and keep domains and publishing under your control.",
      "There's no per-seat or per-page pricing to model into your retainers — the whole thing is free, however many clients you bring.",
    ],
  },
  {
    heading: "Roles that map to how agencies work",
    paragraphs: [
      "Give the junior designer Editor access — they can perfect the draft but can't push it live. Account managers get the Manager role to publish and handle domains. Clients who want to watch get Viewer access to their own analytics. The Owner keeps the keys.",
      "When someone rolls off the account, one click revokes access. No password rotations, no 'who still has the login' audits.",
    ],
  },
  {
    heading: "White-glove details clients notice",
    paragraphs: [
      "Put each client's page on their own domain — free, with automatic HTTPS — and match their brand with themes, fonts, and accent colors. Schedule campaign-day changes in advance so launches go out at the agreed minute, not when someone remembers.",
    ],
  },
];

const faqs = [
  {
    question: "How many client pages can an agency manage?",
    answer:
      "Unlimited. One organization can hold every client page you run, and you can create more organizations if you want harder separation.",
  },
  {
    question: "Can clients have access to their own page?",
    answer:
      "Yes. Invite them with whatever role fits — Viewer to watch analytics, Editor to suggest changes, or Owner if they should hold the keys while you operate.",
  },
  {
    question: "What does Kytelink cost for agencies?",
    answer:
      "Nothing. There's no per-seat, per-page, or agency tier — the product is free and open source.",
  },
  {
    question: "Can each client use their own domain?",
    answer:
      "Yes. Connect each client's domain to their page with two DNS records; HTTPS is automatic.",
  },
  {
    question: "Can we schedule launch-day changes for clients?",
    answer:
      "Yes. Queue the page changes ahead of a campaign and they publish automatically at the exact time you set.",
  },
  {
    question: "How do we hand a page back to a client?",
    answer:
      "Make them the Owner and step your own role down, or remove your team entirely. The page, its domain, and its analytics stay intact — nothing is tied to your agency's login.",
  },
];

export function AgenciesUseCasePage() {
  return (
    <UseCasePageLayout
      useCase={useCase}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="One login. Every client, organized."
    />
  );
}

export default AgenciesUseCasePage;
