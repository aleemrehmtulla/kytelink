import { Section } from "../ui/section";

export interface FeatureBullet {
  title: string;
  description: string;
}

export function FeatureBullets({ bullets }: { bullets: FeatureBullet[] }) {
  return (
    <Section className="border-t border-hairline">
      <div className="mx-auto grid max-w-4xl gap-10 sm:grid-cols-3">
        {bullets.map((bullet) => (
          <div key={bullet.title}>
            <h3 className="text-[15px] font-semibold tracking-tight text-ink">{bullet.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-secondary">{bullet.description}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
