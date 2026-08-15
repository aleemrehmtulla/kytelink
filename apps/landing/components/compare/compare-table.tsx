import { Section } from "../ui/section";

export type CompareValue = boolean | string;

export interface CompareRow {
  label: string;
  kytelink: CompareValue;
  competitor: CompareValue;
}

function YesIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="text-accent">
      <path
        d="M3 8.5l3.2 3.2L13 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NoIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" className="text-faint">
      <path
        d="M4 4l8 8M12 4l-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Cell({ value, yes }: { value: CompareValue; yes: boolean }) {
  if (typeof value === "boolean") {
    return (
      <span className="flex items-center gap-1.5">
        {value ? <YesIcon /> : <NoIcon />}
        <span className="sr-only">{value ? "Yes" : "No"}</span>
      </span>
    );
  }
  return (
    <span className={`text-[13px] leading-snug ${yes ? "text-ink" : "text-secondary"}`}>
      {value}
    </span>
  );
}

export function CompareTable({
  competitorName,
  rows,
  footnote,
}: {
  competitorName: string;
  rows: CompareRow[];
  footnote?: string;
}) {
  return (
    <Section className="border-t border-hairline">
      <div className="mx-auto w-full max-w-4xl">
        <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Kytelink vs {competitorName}, side by side
        </h2>
        <div className="mt-8 overflow-hidden rounded-menu border border-cardline bg-white sm:mt-10">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-canvas">
                <th scope="col" className="w-[38%] px-4 py-4 sm:px-6">
                  <span className="sr-only">Feature</span>
                </th>
                <th
                  scope="col"
                  className="w-[31%] py-4 pr-3 text-[13px] font-semibold text-ink"
                >
                  <span aria-hidden="true">🪁</span> Kytelink
                </th>
                <th
                  scope="col"
                  className="w-[31%] py-4 pr-4 text-[13px] font-semibold text-ink sm:pr-6"
                >
                  {competitorName}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-hairline">
                  <th
                    scope="row"
                    className="px-4 py-3.5 text-left text-[13px] font-medium text-ink sm:px-6"
                  >
                    {row.label}
                  </th>
                  <td className="py-3.5 pr-3">
                    <Cell value={row.kytelink} yes />
                  </td>
                  <td className="py-3.5 pr-4 sm:pr-6">
                    <Cell value={row.competitor} yes={false} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {footnote ? <p className="mt-3 text-xs text-faint">{footnote}</p> : null}
      </div>
    </Section>
  );
}
