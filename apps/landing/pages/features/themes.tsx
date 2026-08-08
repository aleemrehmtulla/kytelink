import { FeaturePageLayout } from "../../components/features-pages/feature-page-layout";
import { ThemeFanMock } from "../../components/features-pages/themes/theme-fan-mock";
import { FontAccentMock } from "../../components/features-pages/themes/font-accent-mock";
import { getFeature } from "../../consts/features";

const feature = getFeature("themes");

const bullets = [
  {
    title: "12 themes, built in",
    description: "From clean and minimal to a glassy dark mode — no design skills needed.",
  },
  {
    title: "Fonts and accents",
    description: "Layer a font and an accent color on top of any theme.",
  },
  {
    title: "Switch anytime",
    description: "Change your look in one click — your links and content stay put.",
  },
];

const sections = [
  {
    heading: "Twelve themes, zero design skills",
    paragraphs: [
      "Kytelink ships twelve built-in themes for your link-in-bio page — from clean light and dark modes to soft pastels, deep midnight blues, and warm paper tones. Each one is tuned by hand: readable text, comfortable spacing, and link buttons that look good with three links or thirty.",
      "Pick one and your whole page updates instantly. No CSS, no design tools, no fighting with a page builder.",
    ],
  },
  {
    heading: "Make it yours with fonts and accents",
    paragraphs: [
      "Layer a font — serif, monospace, cursive, and more — and an accent color on top of any theme. That's enough to make your page unmistakably yours without giving you forty knobs to fiddle with.",
      "Button shapes are adjustable too: rounded, pill, or square, matching however your brand feels.",
    ],
  },
  {
    heading: "Switch anytime, break nothing",
    paragraphs: [
      "Your links, bio, and analytics live separately from your theme, so you can change your look as often as you like — the content stays put. And because every theme is plain CSS with no heavy scripts, your page stays fast no matter which one you pick.",
    ],
  },
];

const faqs = [
  {
    question: "How many themes does Kytelink have?",
    answer:
      "Twelve built-in themes, covering light, dark, colorful, and glassy looks. All of them are free.",
  },
  {
    question: "Can I change the font on my page?",
    answer:
      "Yes. Pick from a set of font styles — serif, monospace, cursive, and more — and it applies across your whole page, on any theme.",
  },
  {
    question: "Can I use my own accent color?",
    answer:
      "Yes. Layer an accent color on top of any theme to match your brand. Your name, links, and highlights pick it up automatically.",
  },
  {
    question: "Will switching themes break my links?",
    answer:
      "No. Themes only change how your page looks. Your links, bio, icons, and analytics stay exactly as they are.",
  },
  {
    question: "Do themes slow my page down?",
    answer:
      "No. Every theme is plain CSS rendered statically — there's no theme engine running in your visitor's browser.",
  },
  {
    question: "Will my theme look right on a phone?",
    answer:
      "Yes. Every theme is built mobile-first — spacing, type sizes, and buttons are tuned for a phone screen, which is where nearly every bio link gets tapped.",
  },
];

export function ThemesFeaturePage() {
  return (
    <FeaturePageLayout
      feature={feature}
      bullets={bullets}
      sections={sections}
      faqs={faqs}
      ctaSubtitle="Pick a theme, or twelve."
      mockups={
        <>
          <ThemeFanMock />
          <FontAccentMock />
        </>
      }
    />
  );
}

export default ThemesFeaturePage;
