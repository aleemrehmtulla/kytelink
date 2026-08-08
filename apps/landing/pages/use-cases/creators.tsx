import { UseCasePageLayout } from "../../components/use-cases/use-case-page-layout";
import { getUseCase } from "../../consts/use-cases";

const useCase = getUseCase("creators");

const sections = [
  {
    heading: "Everything you make, one URL",
    paragraphs: [
      "You publish in a dozen places — a YouTube upload, a TikTok series, an Instagram story, a newsletter issue, a merch restock — but every platform hands you exactly one link in your bio. Point it at the wrong thing and you lose the click; change it every time you launch and you're forever editing profiles. Kytelink gives you one page that holds all of it: the latest video up top, the store, the mailing list, and whatever you're pushing this week.",
      "Because every bio you've ever posted points at that one page, you update in a single place instead of retyping links across five profiles by hand. Reorder the buttons, swap what's featured, retire a dead link — the change is live everywhere your handle appears, and the old posts don't break.",
    ],
  },
  {
    heading: "Live before your coffee's done",
    paragraphs: [
      "Getting online shouldn't be a project. Claim kytelink.com/yourname, pick one of twelve themes, drop in your links, and paste the URL into your bios — the whole thing takes about a minute. There's no page builder to wrestle, no design software to learn, and no watermark or \"upgrade to remove branding\" waiting at the end.",
      "Moving fast now doesn't box you in later. Layer on a custom font and accent color so the page reads like you and not a template, and connect your own domain for free the day you want to look more official — same page, same links, nothing to rebuild.",
    ],
  },
  {
    heading: "Know what your audience actually clicks",
    paragraphs: [
      "Growing an audience is guesswork until you can see what people do once they land on your page. Kytelink's free analytics show which links get tapped, which platforms send the most traffic, and what devices your followers use — so you can tell whether that pinned TikTok is really driving store visits or just racking up views.",
      "It does this without cookies, fingerprinting, or third-party trackers, and visitor IPs are hashed before they're stored. Your page stays fast and your fans never get handed off to ad-tech. Post something, watch the referrer chart move over the next few hours, and put your energy where the clicks already are.",
    ],
  },
  {
    heading: "Line up your next drop in advance",
    paragraphs: [
      "Launches rarely happen while you're sitting at your laptop. Prep the page for a video premiere, a product restock, or a collab — swap the featured link, reorder the buttons — then schedule the whole change to go live at the exact minute it matters. Your bio updates itself while you're filming, asleep, or on camera.",
      "None of this sits behind a creator paywall. There's no follower count to hit and no pro plan gating analytics, themes, or scheduling — because Kytelink is open source and free at every tier, the full toolkit is yours from the first minute.",
    ],
  },
];

const faqs = [
  {
    question: "Is Kytelink free for creators?",
    answer:
      "Yes — completely. Every feature, including analytics, themes, and custom domains, is free on every account. Kytelink is open source; there's no premium tier.",
  },
  {
    question: "Does it work in TikTok, Instagram, and YouTube bios?",
    answer:
      "Yes. Your Kytelink URL is a normal link that works anywhere a bio accepts one — TikTok, Instagram, YouTube, Twitch, X, and everywhere else.",
  },
  {
    question: "How fast can I get set up?",
    answer:
      "About 60 seconds: claim your handle, pick a theme, add links. You can refine it forever, but it's shareable immediately.",
  },
  {
    question: "Can I use my own domain?",
    answer:
      "Yes, free. Point two DNS records at Kytelink and your page lives at yourname.com with automatic HTTPS.",
  },
  {
    question: "How is Kytelink different from Linktree?",
    answer:
      "No paywall, no branding upsell, no locked analytics — and the whole product is open source, so you can even self-host it.",
  },
  {
    question: "Can I schedule changes to my page?",
    answer:
      "Yes. Queue a new link or a full redesign to publish at a set time — line it up for a video premiere or a merch drop and your bio updates the moment it matters, no late-night editing on your phone.",
  },
];

export function CreatorsUseCasePage() {
  return (
    <UseCasePageLayout
      useCase={useCase}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="Claim your handle before someone else does."
    />
  );
}

export default CreatorsUseCasePage;
