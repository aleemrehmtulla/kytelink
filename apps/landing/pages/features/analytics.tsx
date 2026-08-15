import { FeaturePageLayout } from "../../components/features-pages/feature-page-layout";
import { TrafficOverviewMock } from "../../components/features-pages/analytics/traffic-overview-mock";
import { EngagementMock } from "../../components/features-pages/analytics/engagement-mock";
import { AudienceMock } from "../../components/features-pages/analytics/audience-mock";
import { getFeature } from "../../consts/features";

const feature = getFeature("analytics");

const bullets = [
  {
    title: "Privacy-clean by default",
    description: "IPs are hashed before storage. No ad trackers, no third-party cookies.",
  },
  {
    title: "Every link, ranked",
    description: "See exactly which links get clicked, and which get ignored.",
  },
  {
    title: "Where your traffic comes from",
    description: "Referrers, devices, and countries — one dashboard, no setup.",
  },
];

const sections = [
  {
    heading: "Link-in-bio analytics that respect your visitors",
    paragraphs: [
      "Kytelink tracks page views, link clicks, click-through rate, unique visitors, referrers, devices, and countries for your link-in-bio page — without cookies, fingerprinting, or third-party trackers. Visitor IPs are hashed before they're stored, so you get honest numbers and your audience gets left alone.",
      "There's no ad-tech quietly reselling your audience, and far less to disclose than a typical tracking stack. The data belongs to you, full stop.",
    ],
  },
  {
    heading: "See which links actually earn their spot",
    paragraphs: [
      "Every link on your page is ranked by clicks, so you can see at a glance which ones pull their weight and which ones just take up space. Watch click-through rate move as you reorder, retitle, or retire links.",
      "Referrer breakdowns show whether your traffic comes from Instagram, TikTok, YouTube, or search — useful when you're deciding where to spend your next post.",
    ],
  },
  {
    heading: "Real-time, and free forever",
    paragraphs: [
      "Analytics update in real time from lightweight beacons — no megabytes of tracking JavaScript slowing your page down. And unlike most link-in-bio tools, none of it is gated behind a paid tier: every Kytelink account gets full analytics from day one, free.",
    ],
  },
];

const faqs = [
  {
    question: "Is Kytelink analytics free?",
    answer:
      "Yes. Every account gets full analytics — views, clicks, referrers, devices, and countries — free, forever. There is no paid tier hiding the good charts.",
  },
  {
    question: "Do I need a cookie banner for my page?",
    answer:
      "Kytelink's own analytics set no cookies and do no cross-site tracking, and visitor IPs are hashed before storage — so they don't create a consent requirement on their own. What your page needs overall depends on where your visitors are and what else you put on it, and we can't give you legal advice.",
  },
  {
    question: "What metrics does Kytelink track?",
    answer:
      "Page views, link clicks, click-through rate, unique visitors, top links, referrer domains, device types, and visitor countries — all shown for the last 7, 30, or 90 days.",
  },
  {
    question: "Can I export my analytics data?",
    answer:
      "Your links and settings export as JSON anytime. Analytics live in your dashboard — and on a self-hosted instance, the analytics database is yours to query directly.",
  },
  {
    question: "How is this different from Linktree's analytics?",
    answer:
      "Most link-in-bio tools lock analytics behind a subscription. Kytelink gives every account the full dashboard for free, and does it without ad trackers.",
  },
  {
    question: "How quickly do clicks show up?",
    answer:
      "In real time. Views and clicks land on your dashboard within seconds, sent by a lightweight beacon rather than a heavy tracking script — so nothing lags and your page stays fast.",
  },
];

export function AnalyticsFeaturePage() {
  return (
    <FeaturePageLayout
      feature={feature}
      bullets={bullets}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="Free analytics, from day one."
      mockups={
        <>
          <TrafficOverviewMock />
          <EngagementMock />
          <AudienceMock />
        </>
      }
    />
  );
}

export default AnalyticsFeaturePage;
