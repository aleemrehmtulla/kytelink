import { FeaturePageLayout } from "../../components/features-pages/feature-page-layout";
import { ScheduleTimelineMock } from "../../components/features-pages/scheduled-publishing/schedule-timeline-mock";
import { SnapshotDiffMock } from "../../components/features-pages/scheduled-publishing/snapshot-diff-mock";
import { getFeature } from "../../consts/features";

const feature = getFeature("scheduled-publishing");

const bullets = [
  {
    title: "The midnight album drop",
    description: "Queue the release ahead of time — it goes live exactly when you said, timezone and all.",
  },
  {
    title: "Preview before it's live",
    description: "See the scheduled snapshot next to what's currently live.",
  },
  {
    title: "Cancel or reschedule",
    description: "Plans change. Adjust the time or cancel right up until it fires.",
  },
];

const sections = [
  {
    heading: "Queue the change, keep your evening",
    paragraphs: [
      "Scheduled publishing lets you prepare your link-in-bio page ahead of time and have it go live at an exact date and time — the midnight album drop, the 9 AM product launch, the moment tickets go on sale. Edit the draft, pick the moment, and walk away.",
      "When the clock hits, Kytelink publishes the queued version automatically. No alarms, no last-minute typing on your phone, no waking up early because the release went live in another timezone.",
    ],
  },
  {
    heading: "Preview exactly what will go live",
    paragraphs: [
      "The editor shows the scheduled snapshot side by side with what's currently live, so you can confirm the difference before it happens. What you previewed is byte-for-byte what publishes — there's no re-rendering surprise at fire time.",
    ],
  },
  {
    heading: "Change your mind anytime",
    paragraphs: [
      "Plans move. Reschedule to a new time or cancel the queued publish entirely, right up until the moment it fires. Your live page stays untouched until then.",
    ],
  },
];

const faqs = [
  {
    question: "How does scheduled publishing work?",
    answer:
      "Edit your draft, choose a date and time, and confirm. Kytelink stores that snapshot and publishes it automatically at the moment you picked.",
  },
  {
    question: "Can I cancel or reschedule a queued publish?",
    answer:
      "Yes. You can change the time or cancel entirely at any point before it fires. Your live page is untouched until then.",
  },
  {
    question: "Which timezone does the schedule use?",
    answer:
      "The time you pick is stored with its timezone, so a midnight release fires at midnight where you meant it — not where the server lives.",
  },
  {
    question: "What can I schedule?",
    answer:
      "Any change to your page: new links, reordered links, a new theme, updated bio. The whole snapshot goes live at once.",
  },
  {
    question: "Is scheduled publishing free?",
    answer: "Yes — like every Kytelink feature, scheduling is free on every account.",
  },
  {
    question: "Can I keep editing after I schedule a publish?",
    answer:
      "Yes. The scheduled version is a frozen snapshot taken when you queued it, so any further edits stay in your draft and won't go live until you schedule or publish them yourself.",
  },
];

export function ScheduledPublishingFeaturePage() {
  return (
    <FeaturePageLayout
      feature={feature}
      bullets={bullets}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="Set it once. It publishes itself."
      mockups={
        <>
          <ScheduleTimelineMock />
          <SnapshotDiffMock />
        </>
      }
    />
  );
}

export default ScheduledPublishingFeaturePage;
