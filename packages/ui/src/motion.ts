import type { Transition, Variants } from "framer-motion";

// One motion vocabulary (14-design.md): durations 150-250ms, one ease curve,
// small distances. Every editor/admin/landing/auth component imports these
// exact presets — no ad-hoc spring values. Public profile pages import NONE of
// this (CSS-only). Under prefers-reduced-motion, drive framer-motion with
// <MotionConfig reducedMotion="user">, which collapses the transform channels
// below to opacity-only.
const MOTION_DURATION = {
  fast: 0.15,
  base: 0.2,
  slow: 0.25,
} as const;

const MOTION_EASE = [0.4, 0, 0.2, 1] as const;

const MOTION_DISTANCE = {
  sm: 4,
  md: 8,
  lg: 12,
} as const;

const baseTransition: Transition = {
  duration: MOTION_DURATION.base,
  ease: MOTION_EASE,
};

const fastTransition: Transition = {
  duration: MOTION_DURATION.fast,
  ease: MOTION_EASE,
};

// Dialogs, modals, and sheets open and close instantly — no motion presets for
// them, by rule. Do not add modal/sheet variants here.
export const listItemMotion: Variants = {
  hidden: { opacity: 0, y: MOTION_DISTANCE.sm },
  visible: { opacity: 1, y: 0, transition: baseTransition },
  exit: { opacity: 0, y: MOTION_DISTANCE.sm, transition: fastTransition },
};

export const toastMotion: Variants = {
  hidden: { opacity: 0, y: MOTION_DISTANCE.md, transition: fastTransition },
  visible: { opacity: 1, y: 0, transition: baseTransition },
  exit: { opacity: 0, y: MOTION_DISTANCE.md, transition: fastTransition },
};

export const authMorphMotion: Variants = {
  hidden: { opacity: 0, y: MOTION_DISTANCE.sm },
  visible: { opacity: 1, y: 0, transition: baseTransition },
  exit: { opacity: 0, y: -MOTION_DISTANCE.sm, transition: fastTransition },
};
