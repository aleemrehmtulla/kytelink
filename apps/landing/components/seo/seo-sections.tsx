import { Section } from "../ui/section";
import type { FaqEntry } from "./json-ld";

export interface ContentSection {
  heading: string;
  paragraphs: string[];
}

export function LongformSections({ sections }: { sections: ContentSection[] }) {
  return (
    <Section className="border-t border-hairline">
      <div className="mx-auto grid max-w-4xl gap-12 sm:gap-14">
        {sections.map((section) => (
          <div key={section.heading} className="grid gap-4 sm:grid-cols-[280px_1fr] sm:gap-10">
            <h2 className="text-xl font-bold leading-snug tracking-tight text-ink">
              {section.heading}
            </h2>
            <div className="flex flex-col gap-4">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="text-[15px] leading-relaxed text-secondary">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function FaqSection({ faqs }: { faqs: FaqEntry[] }) {
  return (
    <Section className="border-t border-hairline">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Frequently asked questions
        </h2>
        <dl className="mt-8 grid gap-x-10 gap-y-8 sm:mt-10 sm:grid-cols-2">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <dt className="text-[15px] font-semibold tracking-tight text-ink">{faq.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-secondary">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
