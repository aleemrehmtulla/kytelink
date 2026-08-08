import type { StatusTone } from "../../ui/status-pill";

export interface AlertKindMeta {
  label: string;
  tone: StatusTone;
  hint: string;
}

// Keys are normalized kinds: workers write snake_case ("revalidate_dead_letter")
// while the seed writes kebab-case ("revalidate-dead-letter") for the same thing.
const KNOWN_KINDS: Record<string, AlertKindMeta> = {
  revalidate_dead_letter: {
    label: "Revalidate dead-letter",
    tone: "danger",
    hint: "A public page failed to regenerate after every retry, so it may still be serving stale content.",
  },
  moderation_dead_letter: {
    label: "Moderation scan dead-letter",
    tone: "danger",
    hint: "A moderation scan never finished, so that publish was never actually reviewed.",
  },
  moderation_fail_open: {
    label: "Moderation fail-open",
    tone: "warning",
    hint: "The moderation provider was unreachable, so a publish was allowed through unreviewed.",
  },
  scheduled_publish_failed: {
    label: "Scheduled publish failed",
    tone: "danger",
    hint: "A scheduled publish did not go live at its scheduled time.",
  },
};

function normalizeKind(kind: string): string {
  return kind.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function fallbackLabel(kind: string): string {
  const words = normalizeKind(kind).replace(/_+/g, " ").trim();
  if (!words) return "Unlabelled alert";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function alertKindMeta(kind: string): AlertKindMeta {
  const known = KNOWN_KINDS[normalizeKind(kind)];
  if (known) return known;
  return {
    label: fallbackLabel(kind),
    tone: "warning",
    hint: "This alert kind is newer than the admin app — read the message for the detail.",
  };
}
