import { useCallback, useMemo } from "react";
import { useRouter } from "next/router";

export const GROWTH_DAY_OPTIONS = [7, 30, 90] as const;
export type GrowthDays = (typeof GROWTH_DAY_OPTIONS)[number];

const DEFAULT_DAYS: GrowthDays = 30;

function isGrowthDays(value: unknown): value is GrowthDays {
  return GROWTH_DAY_OPTIONS.some((option) => String(option) === value);
}

/** The URL owns the range so a bookmarked "last 90 days" reopens as itself. */
export function useGrowthDays(): { days: GrowthDays; setDays: (next: GrowthDays) => void } {
  const router = useRouter();
  const raw = router.query.d;

  const days = useMemo<GrowthDays>(
    () => (isGrowthDays(raw) ? (Number(raw) as GrowthDays) : DEFAULT_DAYS),
    [raw],
  );

  const setDays = useCallback(
    (next: GrowthDays) => {
      void router.replace(
        { pathname: router.pathname, query: { d: String(next) } },
        undefined,
        { shallow: true },
      );
    },
    [router],
  );

  return { days, setDays };
}
