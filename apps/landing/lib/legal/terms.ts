import type { LegalDocument } from "./types";
import { LEGAL_CONTACT_EMAIL } from "./contact";

// Plain-English draft. Not legal advice — the founder should review before
// launch and name a concrete legal entity and governing-law jurisdiction in
// place of the generic wording here. Every factual claim below was checked
// against the code; if you change how publishing, moderation, teams, or limits
// behave, change this file in the same commit.
export const termsOfService: LegalDocument = {
  title: "Terms of service",
  lastUpdated: "2026-07-26",
  intro:
    "These are the terms for using Kytelink, the hosted version of the product at kytelink.com, operated by the team behind Kytelink. Read them once — they're short on purpose. Using the hosted service means you agree to them.",
  sections: [
    {
      heading: "The service",
      paragraphs: [
        "Kytelink lets you build a link-in-bio page — a kyte — and share it from one link. The hosted service at kytelink.com is free to use. It's free today and we intend to keep it that way; if that ever changes we'll tell you before it affects you, and you'll never be charged without agreeing first.",
        "Free doesn't mean infinite. There are fair-use limits on how many kytes and teammates a workspace can have, how many workspaces you can own or join, and how much you can upload. We show you the current numbers in the product and tell you when you reach one.",
        'Published kytes carry a small "made with kytelink" link by default. Clicking it tells us which kyte sent the visitor, so we can see what\'s driving signups. You can turn the watermark off in your settings.',
        "Kytelink is also open-source software, released under the MIT License. If you'd rather run your own copy on your own infrastructure, you can — we don't operate your deployment, and you're responsible for its uptime and the data it collects. The MIT License governs the code; the intellectual property section below still applies to our name and logo.",
      ],
    },
    {
      heading: "Eligibility",
      paragraphs: [
        "You must be at least 13 years old to use Kytelink. If you're under the age of majority where you live, you need a parent or guardian's permission. If a law in your country sets a higher minimum age for using a service like this, that age applies to you.",
        "By using the hosted service you confirm you meet these requirements and that the information you give us is accurate.",
      ],
    },
    {
      heading: "Your account",
      paragraphs: [
        "You need an account to publish a kyte. You sign in with a one-time code sent to your email, with Google or GitHub if those are enabled, or with a passkey if you register one — there's no password to set or forget.",
        "Keep access to your email and any linked accounts secure, because they control your account. Tell us at " +
          LEGAL_CONTACT_EMAIL +
          " if you think someone else has gotten in. You're responsible for activity that happens under your account.",
      ],
    },
    {
      heading: "Your content",
      paragraphs: [
        "You're responsible for what you publish, including links, text, images, and anything you import from another service.",
        "You keep ownership of the content you upload. You grant us a limited, non-exclusive, worldwide, royalty-free license to store, process, host, and display that content — only so we can run the service: render your kyte to your visitors, generate preview cards, review it for safety, and show you your own analytics. That license ends when you delete the content or your account, apart from copies retained as described in the privacy policy.",
        "A published kyte is public, listed in our sitemap, and open to search engines. A draft you share through a preview link is reachable by anyone holding that link and its passcode. Don't put anything in a kyte that you need to keep private.",
      ],
    },
    {
      heading: "Teams and workspaces",
      paragraphs: [
        "A kyte belongs to the workspace it was created in, not to the person who typed it. Whoever owns the workspace controls its kytes: they can change who has access, move a kyte to another workspace, or delete it. If you leave a workspace or are removed from it, you lose access to its kytes and the content stays with the workspace. Your personal workspace is yours alone.",
        "If you invite someone, you're confirming you're entitled to share that workspace's content with them. Workspace owners can see an audit trail of who did what.",
      ],
    },
    {
      heading: "Custom domains",
      paragraphs: [
        "You can point a domain you own at your kyte. You're responsible for owning and renewing that domain and for keeping its DNS pointed at us; we handle verification and the certificate. If your kyte is suspended, or your account ends, the domain stops resolving to us and is yours to repoint wherever you like.",
      ],
    },
    {
      heading: "Acceptable use",
      paragraphs: [
        "Don't use Kytelink to impersonate someone else, run phishing or scam pages, sell or promote illegal goods, host content that's illegal where you or your visitors are, harass anyone, or distribute malware. Don't publish content that sexualizes minors — that gets reported, not just removed.",
        "Don't try to break, overload, probe, or scrape the service, work around rate limits, resell the hosted service as your own, or use it to send spam. Automated access outside of normal use of the product isn't allowed.",
        "A kyte can be set to forward visitors straight to another address instead of showing a page. You're responsible for where it forwards to; using a redirect to disguise a destination, or to send visitors somewhere that breaks these rules, is a violation.",
        "We run automated and manual moderation on published pages. Publishing goes live immediately; an automated review runs right afterward and can suspend a page, and we also review pages that are reported. Either way, we can review any kyte at any time.",
      ],
    },
    {
      heading: "Reporting a problem",
      paragraphs: [
        "To report a kyte that impersonates someone, runs a scam, hosts illegal content, or infringes your rights, use the report form at kytelink.com/report or email " +
          LEGAL_CONTACT_EMAIL +
          ".",
        "For a copyright claim, tell us what work was infringed, where it appears on Kytelink, how to reach you, and confirm in good faith that you're the rightsholder or authorised to act for them. We remove infringing content, and accounts that infringe repeatedly are closed.",
      ],
    },
    {
      heading: "Suspension and appeals",
      paragraphs: [
        "We can suspend a kyte that violates acceptable use. For serious cases — phishing, malware, illegal content — we may act without advance notice. For everything else, we'll try to tell you why and give you a chance to fix it. In serious or repeated cases we suspend the whole workspace, or the account, rather than one page — that takes every kyte you own offline.",
        "A suspension makes things read-only; it doesn't delete them. A suspended account can still sign in and read its own data, the recorded reason is shown to you, and nothing expires on its own: a suspension stays until a person has reviewed it, and restoring puts everything back as it was.",
        "If you think we've got it wrong, appeal at kytelink.com/appeal — a person reads every appeal and we answer fast. " +
          LEGAL_CONTACT_EMAIL +
          " also works.",
        "You can stop using Kytelink whenever you want, and you can ask us to delete your kyte or your account (see the privacy policy for how, and for what we keep afterward). Deletion is permanent.",
      ],
    },
    {
      heading: "Intellectual property",
      paragraphs: [
        "The Kytelink name, logo, and the look and feel of the hosted service belong to us. Nothing in these terms gives you the right to use our branding except to link to your own kyte.",
        "The Kytelink source code is published under the MIT License. That license governs the code and your right to self-host or modify it. It does not grant any right to the hosted service, our infrastructure, our data, or our trademarks — those stay with us.",
      ],
    },
    {
      heading: "Third-party links and services",
      paragraphs: [
        "A kyte is mostly links to other places, and a kyte can be set to forward visitors on without showing a page first. We don't control the sites a kyte links or forwards to, and we don't endorse them or take responsibility for their content, safety, or privacy practices. Follow links at your own discretion.",
        "The hosted service also relies on third-party providers (described in the privacy policy) to send email, store uploads, run analytics, and help review content. Their own terms apply to the parts they operate.",
      ],
    },
    {
      heading: "No warranty",
      paragraphs: [
        'Kytelink is provided "as is" and "as available." We aim for high uptime and fix problems quickly, but we don\'t guarantee the service will always be available, error-free, secure, or fit for a particular purpose, and we don\'t guarantee that content you publish will always be reachable.',
        "Nothing we publish about Kytelink — including anything on our marketing pages about analytics, cookies, or privacy — is legal advice about your own obligations. What your page needs where your visitors live is your call.",
      ],
    },
    {
      heading: "Limitation of liability",
      paragraphs: [
        "To the fullest extent the law allows, Kytelink and its operator aren't liable for indirect, incidental, or consequential damages, or for lost profits, lost data, or lost goodwill arising from your use of the hosted service. Since the hosted service is free, our total liability to you for any claim is limited to the greater of the amount you paid us in the previous twelve months (which for the free service is zero) or the minimum amount the law requires.",
        "Some places don't allow these limits, so parts of this section may not apply to you.",
      ],
    },
    {
      heading: "Indemnity",
      paragraphs: [
        "If someone brings a claim against us because of content you published or how you used the service — for example a copyright complaint or a report of abuse — you agree to cover the reasonable costs we incur defending it, to the extent the claim comes from your actions.",
      ],
    },
    {
      heading: "Termination",
      paragraphs: [
        "You can close your account at any time. We can suspend or end your access if you break these terms, if we're required to by law, or if we stop offering the hosted service. Where practical we'll give notice. The sections that should outlast the account — content license wind-down, no warranty, limitation of liability, and indemnity — survive termination.",
      ],
    },
    {
      heading: "Governing law",
      paragraphs: [
        "These terms are governed by the laws of the jurisdiction in which Kytelink's operator is established, without regard to conflict-of-laws rules, and any dispute will be handled by the courts located there.",
      ],
    },
    {
      heading: "Changes",
      paragraphs: [
        "We may update these terms as the product changes. Meaningful changes update the date at the top of this page, and where a change is significant we'll try to flag it in the product. Continuing to use the hosted service after a change means you accept the updated terms.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [`Questions about these terms? Email ${LEGAL_CONTACT_EMAIL}.`],
    },
  ],
};
