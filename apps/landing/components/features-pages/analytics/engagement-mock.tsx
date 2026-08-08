import { ReferrersList, TopLinksBarList } from "@kytelink/ui";
import { MOCK_REFERRERS, MOCK_TOP_LINKS } from "../../../lib/mock-analytics";

export function EngagementMock() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="rounded-card border border-cardline bg-card p-5 text-ink sm:p-6">
        <h3 className="text-[13px] font-semibold text-ink">Top links</h3>
        <div className="mt-4">
          <TopLinksBarList data={MOCK_TOP_LINKS} />
        </div>
      </div>
      <div className="rounded-card border border-cardline bg-card p-5 text-ink sm:p-6">
        <h3 className="text-[13px] font-semibold text-ink">Referrers</h3>
        <div className="mt-4">
          <ReferrersList data={MOCK_REFERRERS} />
        </div>
      </div>
    </div>
  );
}
