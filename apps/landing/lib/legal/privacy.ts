import type { LegalDocument } from "./types";
import { LEGAL_CONTACT_EMAIL } from "./contact";

// Plain-English draft. Not legal advice — the founder should review before
// launch and state a concrete legal entity in place of the generic wording
// here. Every factual claim below was checked against the code; if you change
// what the product collects, stores, or sends to a third party, change this
// file in the same commit.
export const privacyPolicy: LegalDocument = {
  title: "Privacy policy",
  lastUpdated: "2026-07-26",
  intro:
    "This covers what Kytelink collects on the hosted service at kytelink.com, why, and how to control it. It's operated by the team behind Kytelink. Written for humans, not lawyers.",
  sections: [
    {
      heading: "What we collect",
      paragraphs: [
        "Account info: your email address, and the sign-in identity you use — a one-time email code, a Google or GitHub account if you connect one, or a passkey if you register one. We never ask for or store an account password. If you sign in with Google or GitHub, we also store that provider's account identifier, the access and refresh tokens that keep the connection working, and the display name and profile picture they give us. A passkey stores only a public credential and basic information about the authenticator, never your fingerprint, face, or device secrets.",
        "Profile content: whatever you put in your kyte — your username, display name, description, links, social icons and the handles behind them, theme, font, color and background choices, SEO title and description, any address you set your kyte to forward visitors to, any custom domain you connect, and any avatar, link image, or preview image you upload. If you schedule a publish for later, we store a snapshot of the kyte as it was when you scheduled it, along with the timezone you chose.",
        "Preview links: if you share a draft for review, we store the link's token and its passcode so the editor can show them to you again whenever you reopen the panel. Treat that passcode as a share code rather than a password — it is stored in a readable form, and anyone holding the link and the code can see the draft.",
        "Team info: if you invite someone to a shared workspace, we store the email address you invite, the role and page access you grant, who sent the invite, and the membership that results. We also keep an audit record of significant actions in a workspace — who invited whom, who changed access, who published — so account owners can see what happened. Those records include the email address that was invited, and we keep them after the invite itself is gone. While teammates are editing together, we briefly note who is present on a page.",
        "Analytics: page views and link clicks on published kytes, plus a small set of product events — for example completing an onboarding step, publishing, adding a link, or clicking the Kytelink watermark on someone's page. We also record a page-view event when you visit kytelink.com itself, including these legal pages. We don't run third-party ad trackers.",
        "Safety records: when a page is reviewed, automatically or by a person, we keep the outcome, the reason, the categories it was judged against, and the signals behind the decision. If someone reports a page, we keep the report, what they wrote, and a hashed form of the reporter's IP address so we can spot coordinated or repeated false reporting. We keep these records separately from the page itself, so they survive after the page is gone. We also record when an account is suspended or restored, and why.",
        "Session and device records: when you sign in, we record the session, along with the IP address and browser user-agent it was created from, so we can operate the service and investigate account compromise. Those records are deleted when the session expires.",
      ],
    },
    {
      heading: "Why we collect it, and the basis",
      paragraphs: [
        "To run the service (our contract with you and our legitimate interest in operating it): authenticate you, render your kyte, deliver email you ask for such as login codes and invites, and show you analytics for your own pages.",
        "To keep the platform safe (legitimate interest and legal obligation): automated and manual moderation of published content, rate limiting, and abuse investigation.",
        "Where the law requires consent for something, we ask for it, and you can withdraw it. We don't sell your personal information, we don't share it for cross-context behavioural advertising, and we don't use it for third-party advertising.",
      ],
    },
    {
      heading: "How analytics and IP addresses are handled",
      paragraphs: [
        "When someone visits a published kyte, we record the view with a timestamp, the link they clicked, an approximate country, a coarse device type (mobile, tablet, or desktop), the page that referred them, and an automated flag for whether the request looks like a bot. Country comes from a header your network edge provider adds, not from us looking up your location. The visitor's browser user-agent is used in the moment to work out the device type and the bot flag, and is not stored.",
        "We don't store raw IP addresses in our analytics tables. An IP is turned into a one-way hash combined with the current date, which lets us de-duplicate views and estimate unique visitors within a single day, and changes the next day so the value can't be used to follow someone across days. Because the date isn't secret, we treat that hash as pseudonymous data rather than anonymous data, and protect it accordingly.",
        "Raw IP addresses do appear elsewhere in the ordinary course of running a service, and we'd rather say so than imply otherwise: as short-lived keys used to enforce rate limits, in our server request logs, and on the session record created when you sign in. We don't use any of these to build a profile of you or to track you across sites.",
      ],
    },
    {
      heading: "Cookies and local storage",
      paragraphs: [
        "The marketing site (kytelink.com) sets one first-party cookie, kyte_ref, for 24 hours, to attribute a signup to the kyte whose watermark link you clicked. It contains a username, nothing personal, and expires automatically.",
        "The app uses a signed, http-only session cookie to keep you logged in, marked secure and same-site over HTTPS. Signing in also stores your user identifier and email address in your browser, in local storage and in a companion cookie, so the editor can load your account immediately — unlike the session cookie, that companion value is readable by scripts on the page and is not what actually authenticates you. The app additionally sets short-lived first-party cookies that the sign-in flow needs, such as an OAuth state cookie, remembers which kyte you last had open, and keeps small interface preferences locally.",
        "There are no third-party analytics, advertising, or error-tracking cookies anywhere on the hosted service, and no third-party trackers or tag managers. Fonts are served by us rather than fetched from another company.",
      ],
    },
    {
      heading: "Automated decisions and AI",
      paragraphs: [
        "We use automated review to help keep the platform safe. When you publish, your page goes live immediately and the review runs right after; if it finds a serious problem, the page can be suspended. When we use an external AI provider for this, it receives your page's public content — username, display name, description, link titles and URLs, icons, any forwarding address, and your uploaded profile image. It does not receive your email address.",
        "If you use the importer to bring a page over from another link-in-bio service, we fetch the page you point us at and send its contents to the same kind of provider so it can suggest links for you. You review what it proposes before anything is published.",
        "We don't use your content to train AI models, and our providers are engaged on terms that don't permit them to either. A moderation decision that suspends a page can be appealed — see the terms of service for how.",
      ],
    },
    {
      heading: "Who processes your data (subprocessors)",
      paragraphs: [
        "We use a small set of providers to run the hosted service, in these categories: application hosting; the primary database (a managed Postgres); a managed Redis for caching, rate limits, and background job queues; analytics storage (a managed ClickHouse); object storage for uploaded images (an S3-compatible bucket, served through a CDN); email delivery for login codes, invites, and service notices; an OpenAI-compatible API for the content review and import features described above; and, if you connect a custom domain, the provider that verifies it and issues its certificate. We may change providers within these categories as the service grows.",
        "If you choose to sign in with Google or GitHub, that provider handles the sign-in itself and necessarily learns that you use Kytelink; we receive only your email address and basic profile in return.",
        "None of these providers receive more than they need to do their job, none are used for advertising, and each is bound by its own data-processing terms.",
      ],
    },
    {
      heading: "How long we keep it",
      paragraphs: [
        "We keep account and profile content for as long as your account is active. Invites expire automatically after 14 days, and sessions are cleared once they lapse.",
        "We keep analytics for as long as it's useful for understanding how the product is used. We don't currently apply a fixed deletion window to it, and we'd rather tell you that than name a period we don't enforce; if we set one, we'll state it here. Server logs are deleted after 90 days. Safety and audit records — moderation decisions, abuse reports, and workspace audit trails — are kept for as long as we need them for security, dispute, and legal purposes, which may be longer than the content they refer to.",
      ],
    },
    {
      heading: "Deleting your kyte or your account",
      paragraphs: [
        "You can delete a kyte at any time from the editor. That permanently removes the page and its content from our database — there's no recycle bin and no recoverable copy — and takes the published page offline.",
        "To delete your whole account, email us and we'll handle it. Deletion is permanent. Two things honestly don't disappear with it: the safety and audit records described above, which we keep deliberately, and analytics rows and stored image files, which are not currently removed by the deletion process. If you want the images you uploaded purged as well, say so in your request and we'll do it by hand.",
      ],
    },
    {
      heading: "What's public",
      paragraphs: [
        "A published kyte is public by design. We list published pages in our sitemap and allow search engines to index them, so your page, your username, and what you put on it can appear in search results and be copied or archived by others. Unpublishing removes a page from our sitemap and takes it offline, but we can't force a search engine or archive to forget a copy it already made.",
      ],
    },
    {
      heading: "How we protect it",
      paragraphs: [
        "We don't store account passwords at all — sign-in is by email code, OAuth, or passkey. Session cookies are signed and http-only, analytics IPs are hashed rather than stored, and traffic runs over HTTPS.",
        "A small number of platform administrators can access account data to operate and moderate the service. An administrator can also open a time-limited support session that views the product as your account, which is sometimes the only way to reproduce a problem you report. Every such session requires a stated reason, is limited in time, and is recorded in an admin audit log.",
        "No system is perfectly secure, but we design to collect little and to keep sensitive raw identifiers out of storage where we reasonably can.",
      ],
    },
    {
      heading: "International transfers",
      paragraphs: [
        "Our providers may process data in countries other than yours, including the United States. Where required, transfers rely on appropriate safeguards such as standard contractual clauses. By using the hosted service you understand your data may be processed in those locations.",
      ],
    },
    {
      heading: "Children's privacy",
      paragraphs: [
        "Kytelink isn't directed at children under 13, and we don't knowingly collect their personal information. If you believe a child has given us data, email us and we'll delete it.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        `Depending on where you live, you can ask to access, correct, export, or delete your personal data, and to object to or restrict certain processing. Email ${LEGAL_CONTACT_EMAIL} and we'll verify the request and act on it within a reasonable time, and within any period the law requires. We won't treat you differently for exercising a right.`,
        "The editor also lets you export a kyte's own content as a file and delete a kyte outright, which covers the most common requests without waiting on us. A full export of everything tied to your account — and account deletion itself — goes through the email address above. You can complain to your local data protection authority if you think we've handled your data wrongly.",
      ],
    },
    {
      heading: "Self-hosted instances",
      paragraphs: [
        "If you're using a self-hosted copy of Kytelink rather than kytelink.com, this policy doesn't apply — the operator of that instance controls data collection and processing and is the controller of that data.",
        "One exception worth naming: pages served by a self-hosted instance carry a \"made with kytelink\" watermark by default, and it links here. If one of that instance's visitors clicks it, we see that visit the same way we'd see any other visit to kytelink.com. Operators who don't want that can remove the watermark.",
      ],
    },
    {
      heading: "Changes",
      paragraphs: [
        "We may update this policy as the product changes. The date at the top reflects the latest version, and we'll flag significant changes in the product where we can.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        `Questions about this policy, or want to exercise a right? Email ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};
