import { getCdnUrl } from "@kytelink/cdn";
import { DEMO_ORG, DEMO_ORG_KYTES } from "../../../consts/org-demo";

export function OrgPagesMock() {
  return (
    <div className="rounded-card border border-cardline bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={getCdnUrl(DEMO_ORG.logo)}
            alt={DEMO_ORG.name}
            loading="lazy"
            decoding="async"
            className="size-9 flex-shrink-0 rounded-pill border border-hairline bg-white object-cover"
          />
          <h3 className="truncate text-[13px] font-semibold text-ink">{DEMO_ORG.name}</h3>
        </div>
        <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-pill bg-tint px-2.5 py-1 text-[11px] font-medium text-secondary">
          <span className="h-1.5 w-1.5 rounded-pill bg-success" aria-hidden="true" />
          {DEMO_ORG.members} members
        </span>
      </div>
      <ul className="mt-5 flex flex-col divide-y divide-hairline">
        {DEMO_ORG_KYTES.map((page) => (
          <li key={page.handle} className="flex items-center justify-between gap-3 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={getCdnUrl(page.logo)}
                alt={page.name}
                loading="lazy"
                decoding="async"
                className="size-9 flex-shrink-0 rounded-input border border-hairline bg-white object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-ink">{page.name}</p>
                <p className="truncate text-xs text-tertiary">kytelink.com/{page.handle}</p>
              </div>
            </div>
            <span className="flex-shrink-0 rounded-pill border border-cardline px-2.5 py-0.5 text-[11px] font-medium text-secondary">
              Live
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
