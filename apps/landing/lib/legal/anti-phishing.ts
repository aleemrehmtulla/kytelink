import type { LegalDocument } from "./types";
import { LEGAL_CONTACT_EMAIL } from "./contact";
import { GITHUB_REPO_URL } from "../../consts/site";

export const ANTI_PHISHING_FLOW_SLOT = "review-flow";

export const antiPhishingStatement: LegalDocument = {
  title: "Anti-phishing statement",
  lastUpdated: "2026-07-25",
  intro:
    "Kytelink has been used to run phishing pages. Not as an edge case — at volume, for a long stretch of the product's first version. This page is our public account of it: what went wrong, what we rebuilt, and exactly how every page published on kytelink.com is reviewed today. It describes the system that is actually running, in the detail needed to check the claim.",
  sections: [
    {
      heading: "What went wrong",
      paragraphs: [
        "The first version of Kytelink gave anyone a free, instantly public page on a domain that had built up real reputation. That combination is attractive to scammers, and they took it. The recurring pattern was impersonation: a page dressed up as a telecom provider, an internet provider, a bank, a delivery service, or a crypto exchange — usually posing as its support desk, login screen, account-verification step, or recovery flow — with links pointing at credential-harvesting sites.",
        "The underlying failure was structural, not accidental. Moderation in the first version was reactive: a page went live the moment it was published and stayed live until a human happened to report it. Nothing was checked at publish time, and nothing re-checked a page that was published clean and then quietly edited into a phishing page afterwards. That second gap is the one most abuse actually walked through.",
        "We are stating this plainly rather than quietly patching it, because anyone deciding whether to trust a kytelink.com link deserves to know both what happened and what specifically changed.",
      ],
    },
    {
      heading: "What changed",
      paragraphs: [
        "Kytelink has been rebuilt from the ground up. The rewrite touched everything — the editor, the publishing pipeline, the infrastructure — and the anti-phishing review layer is part of the publish path itself, not a scanner bolted on afterwards.",
        "Three things are different in kind, not degree. Every publish is reviewed, not just the first one, which closes the publish-clean-then-edit hole. Automated checks are deliberately tuned to under-block, so a machine's decision is provisional. And every suspension is reviewed by a person, who is the only one who can uphold it or lift it.",
        "Before the rewrite opened to the public, every profile carried over from the old version was re-reviewed by the same pipeline. Known phishing entered launch day already suspended rather than waiting to be reported.",
      ],
    },
    {
      heading: "How a review works, end to end",
      paragraphs: [
        "A review runs on every publish — manual, scheduled, or triggered by an admin re-review. It moves through a content fingerprint, a set of free deterministic checks, an AI pass over whatever survives them, and then, for anything suspended, a human.",
      ],
      slot: ANTI_PHISHING_FLOW_SLOT,
    },
    {
      heading: "Step one: the content fingerprint",
      paragraphs: [
        "Each review starts by fingerprinting the published content — a hash over the username, display name, bio, every link title and URL, icon URLs, the avatar, and the redirect target. If that fingerprint is unchanged from a version already reviewed, the stored verdict is reused instead of re-running the checks.",
        "This exists so that reviewing every single publish stays affordable. It is deliberately narrow: any edit to any reviewed field produces a new fingerprint and a fresh review, and a reused verdict can never lift a suspension.",
        "Verdicts also carry the publish they reviewed. If a newer publish lands while a review is in flight, the older verdict is discarded rather than applied — a verdict is never enforced against content it did not actually see.",
      ],
    },
    {
      heading: "Step two: deterministic checks",
      paragraphs: [
        "Before any model is involved, the content runs through pattern checks that cost nothing and complete in milliseconds. A match here suspends the page immediately, at full confidence, without spending a model call, and records which check fired. They target the phishing signatures we have seen most often:",
      ],
      bullets: [
        "Brand impersonation keywords across the username, display name, bio, and link titles — telecom and internet providers, banks, delivery companies, crypto exchanges and wallets, plus support, help desk, account recovery, and account verification phrasing.",
        "Lookalike domains in any link or redirect target: punycode and internationalized-domain labels, homoglyph substitutions (zero for the letter o, one for l, rn collapsed to m), and near-miss spellings within one edit of a known brand domain.",
        "A blocklist of known IP-logger and visitor-grabber services.",
        "Link shorteners, which hide the real destination, and top-level domains with disproportionate abuse rates.",
        "Account-level mismatch: a page carrying a company's brand name published from a free consumer mail account.",
      ],
    },
    {
      heading: "Step three: the AI review",
      paragraphs: [
        "Anything that clears the deterministic checks goes to a single multimodal model call on the hosted service. It receives the profile text, every link URL, the redirect target, and the avatar image, and must return a structured verdict: approve or suspend, plus categories, a confidence score, a written reason, and which specific signals fired. The response is schema-enforced, so a verdict is always machine-checkable and always logged with its reasoning.",
        "The policy it applies covers phishing and impersonation of a real company or its support, login, verification, or account-recovery flows; malicious and lookalike links; and adult content, which is not permitted on the hosted service.",
        "Its calibration is the part worth stating explicitly: ambiguity approves. Ordinary profiles, low-confidence cases, and content that is adult-adjacent but legal are approved and logged rather than removed. We would rather miss a bad page and catch it in human review than take down a legitimate one, so the model is instructed not to be trigger-happy.",
        "If the provider fails, the call is retried and then fails open — the page is approved, flagged for follow-up, and an internal alert is raised. An outage at a vendor must not silently freeze publishing for everyone, and those pages land in the human queue regardless.",
      ],
    },
    {
      heading: "Step four: the human gate",
      paragraphs: [
        "Automation can suspend a page. It cannot do anything more than that. Every suspension — whether it came from a deterministic hit, the model, a sweep, or a report — opens a case for a person, carrying the verdict, the confidence, the written reason, and the exact signals that fired.",
        "A reviewer then restores the page or upholds the suspension. Suspension is the only enforcement outcome there is: nothing is deleted, nothing is permanent by default, and a suspension stays in place until a person has looked at it. It is never lifted automatically either — not by a cache hit, not by re-publishing, not by any action the page's owner can take on their own. Every decision is written to an audit log with the reviewer and their stated reason.",
        "Admins can also open a case by hand on any page, with a note, without waiting for automation or a report.",
      ],
    },
    {
      heading: "What a suspension actually does",
      paragraphs: [
        "A suspension is immediate and comprehensive. The public page is replaced by a plain notice and marked no-index, no-follow so it drops out of search. Uploaded images and the avatar are quarantined off the CDN, so the assets stop being reachable even by direct link. The page becomes read-only for everyone on the account — no edits, publishes, uploads, or new preview links — and any scheduled publishes are held.",
        "Suspensions come at three scopes: a single page, an organization (which takes every page in it offline), or an account (which suspends every organization that account owns). The wider scopes are for repeat or account-level abuse rather than one bad page.",
        "A suspended account can still sign in. It is read-only, not locked out — the whole point is that the person can still read their own data, see the recorded reason, and appeal. Nothing is deleted, and no suspension expires on its own: it stays until a person reviews it, and restoring brings everything back exactly as it was.",
        "The owners of the account are emailed with the reason and a link to the appeal form.",
      ],
    },
    {
      heading: "Appeals",
      paragraphs: [
        "There is one appeal path, and it is the same in every place a suspension appears — the public notice, the banner in the editor, and the email: the form at kytelink.com/appeal. No account needed, it works for a page, an organization, or an account, and a person reads every one. We answer them fast, because a wrongly suspended page is our mistake to fix, not yours to wait out.",
        "We accept that under-blocking means some legitimate pages will still be caught. When that happens the fix is a restore, and the page returns with its content, links, and analytics intact.",
        `And if you would rather not depend on our judgement at all, you don't have to. Kytelink is open source under the MIT License — [running your own copy](${GITHUB_REPO_URL}) is always an option, and nothing on this page applies to it.`,
      ],
    },
    {
      heading: "Reporting a page",
      paragraphs: [
        "Anyone can report a Kytelink page at kytelink.com/report, without an account. Tell us the username and what you saw.",
        "Reports never automatically suspend anything, and that is deliberate — an auto-suspending report button just hands the takedown control to whoever files the most reports. A report opens a case in the same human review queue, where it is treated as a request to suspend and decided by a reviewer.",
        "The form always responds the same way regardless of what you submit. It will not confirm whether a username exists, so it cannot be used to probe the platform.",
      ],
    },
    {
      heading: "What this statement does not cover",
      paragraphs: [
        "This describes the hosted service at kytelink.com. That is the only domain it covers.",
        "Kytelink is open-source software under the MIT License, and anyone can run their own copy. Self-hosted instances ship with the review provider turned off by default and are operated entirely by whoever runs them — we do not review, monitor, or have any control over pages on someone else's deployment. A page is only covered by this statement if it is served from kytelink.com.",
        `The code that performs everything described here is in [the public repository](${GITHUB_REPO_URL}), including the keyword lists, the lookalike-domain detection, the review pipeline, and the exact policy given to the model. You do not have to take this page's word for any of it.`,
      ],
    },
    {
      heading: "Limits we will state plainly",
      paragraphs: [
        "No review layer catches everything, and one tuned to avoid wrongful takedowns catches less than a maximally aggressive one would. Some phishing will get through the automated pass. Reports and human review are how it gets caught, and that is the intended design rather than a gap in it.",
        "Reviews evaluate link destinations as they are at publish time; we do not continuously crawl the sites a page links to. A destination that is clean when reviewed can be changed on the other end afterwards. If you see that, report the page and a person will look at it.",
        "We will keep publishing changes to this system here. If the review pipeline changes materially, this page and its date change with it.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "Report a page at kytelink.com/report. Appeal a suspension at kytelink.com/appeal.",
        `For anything else about this statement, including security disclosures and press enquiries, email ${LEGAL_CONTACT_EMAIL}.`,
      ],
    },
  ],
};
